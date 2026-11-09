import { useSyncExternalStore } from 'react';
import { getState, mergeStates, onUserChange, replaceState, revive, shareable } from './store';

/**
 * Synchronisation entre appareils via un « gist secret » du compte GitHub de l'utilisateur.
 * Aucun serveur : l'app lit et écrit directement le fichier, avec une clé limitée aux gists.
 * La clé reste sur l'appareil ; elle n'est jamais incluse dans la progression ni dans les sauvegardes.
 */

const CFG_KEY = 'madrid-espanol-sync';
const FILE = 'espanol-progression.json';
const API = 'https://api.github.com';

export interface SyncConfig {
  token: string;
  login?: string;
  gistId?: string;
}

export interface SyncStatus {
  connected: boolean;
  login?: string;
  state: 'idle' | 'syncing' | 'ok' | 'error' | 'offline';
  lastSync?: string; // ISO
  message?: string;
}

let status: SyncStatus = { connected: false, state: 'idle' };
const listeners = new Set<() => void>();
function setStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch };
  listeners.forEach((l) => l());
}

export function useSyncStatus() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => status,
  );
}

function readCfg(): SyncConfig | null {
  try {
    const raw = localStorage.getItem(CFG_KEY);
    return raw ? (JSON.parse(raw) as SyncConfig) : null;
  } catch {
    return null;
  }
}
function writeCfg(c: SyncConfig | null) {
  try {
    if (c) localStorage.setItem(CFG_KEY, JSON.stringify(c));
    else localStorage.removeItem(CFG_KEY);
  } catch {
    /* stockage indisponible */
  }
}

class SyncError extends Error {}

async function api<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API + path, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
      cache: 'no-store',
    });
  } catch {
    throw new SyncError('offline');
  }
  if (res.status === 401) throw new SyncError('La clé GitHub est refusée : elle a peut-être expiré ou été supprimée. Créez-en une nouvelle.');
  if (res.status === 403 || res.status === 404) {
    const scopes = res.headers.get('x-oauth-scopes');
    if (scopes !== null && !scopes.includes('gist')) throw new SyncError('La clé n’a pas l’autorisation « gist ». Créez-en une avec la case « gist » cochée.');
    throw new SyncError(`GitHub a refusé la demande (code ${res.status}).`);
  }
  if (!res.ok) throw new SyncError(`GitHub ne répond pas correctement (code ${res.status}). Réessayez plus tard.`);
  return (await res.json()) as T;
}

interface GistFile { content?: string; raw_url?: string; truncated?: boolean }
interface Gist { id: string; files: Record<string, GistFile> }

async function readRemote(cfg: SyncConfig): Promise<string | null> {
  if (!cfg.gistId) return null;
  const g = await api<Gist>(cfg.token, `/gists/${cfg.gistId}`);
  const f = g.files[FILE];
  if (!f) return null;
  if (f.truncated && f.raw_url) {
    const r = await fetch(f.raw_url, { cache: 'no-store' });
    return r.ok ? r.text() : null;
  }
  return f.content ?? null;
}

let running: Promise<void> | null = null;

/** Récupère la copie distante, fusionne, puis renvoie le résultat s'il a changé. */
export function syncNow(): Promise<void> {
  if (running) return running;
  running = (async () => {
    const cfg = readCfg();
    if (!cfg) return;
    setStatus({ state: 'syncing', message: undefined });
    try {
      const remoteRaw = await readRemote(cfg);
      let merged = getState();
      if (remoteRaw) {
        merged = mergeStates(getState(), revive(remoteRaw));
        replaceState(merged);
      }
      const content = JSON.stringify(shareable(merged));
      if (content !== remoteRaw) {
        if (cfg.gistId) {
          await api(cfg.token, `/gists/${cfg.gistId}`, { method: 'PATCH', body: JSON.stringify({ files: { [FILE]: { content } } }) });
        } else {
          const g = await api<Gist>(cfg.token, '/gists', {
            method: 'POST',
            body: JSON.stringify({ description: 'Madrid · Español : progression (synchronisation)', public: false, files: { [FILE]: { content } } }),
          });
          writeCfg({ ...cfg, gistId: g.id });
        }
      }
      setStatus({ state: 'ok', lastSync: new Date().toISOString() });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === 'offline') setStatus({ state: 'offline', message: 'Hors ligne : la synchronisation reprendra au retour du réseau.' });
      else setStatus({ state: 'error', message: msg });
    }
  })().finally(() => {
    running = null;
  });
  return running;
}

/** Relie cet appareil au compte GitHub, retrouve la sauvegarde existante s'il y en a une. */
export async function connect(token: string) {
  token = token.trim();
  if (!token) throw new Error('Collez la clé GitHub.');
  setStatus({ state: 'syncing', message: undefined });
  try {
    const user = await api<{ login: string }>(token, '/user');
    const gists = await api<Gist[]>(token, '/gists?per_page=100');
    const existing = gists.find((g) => g.files && g.files[FILE]);
    writeCfg({ token, login: user.login, gistId: existing?.id });
    setStatus({ connected: true, login: user.login });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    setStatus({ state: 'error', message: msg === 'offline' ? 'Pas de connexion internet.' : msg });
    throw e;
  }
  await syncNow();
}

export function disconnect() {
  writeCfg(null);
  setStatus({ connected: false, login: undefined, state: 'idle', lastSync: undefined, message: undefined });
}

let timer: number | undefined;
/** Synchronise au démarrage, au retour dans l'app, au retour du réseau et quelques secondes après chaque progrès. */
export function startSync() {
  const cfg = readCfg();
  setStatus({ connected: !!cfg, login: cfg?.login });
  const schedule = (delay: number) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (readCfg()) syncNow();
    }, delay);
  };
  onUserChange(() => schedule(5000));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') schedule(300);
    else if (readCfg()) syncNow(); // on envoie avant que l'app passe en arrière-plan
  });
  window.addEventListener('online', () => schedule(500));
  if (cfg) schedule(200);
}

export const TOKEN_URL =
  'https://github.com/settings/tokens/new?scopes=gist&description=' + encodeURIComponent('Madrid Español – synchronisation');
