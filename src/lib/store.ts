import { useSyncExternalStore } from 'react';
import type { Card } from 'ts-fsrs';
import type { ErrorCat } from '../data/types';

export interface ErrorEvent {
  cat: ErrorCat;
  at: string; // ISO
  session: string;
  item: string;
}

export interface AppState {
  v: 1;
  createdAt: string;
  departure: string; // AAAA-MM
  dailyGoalMin: number;
  /** Préférences de voix (identifiants voiceURI) et débit de lecture. */
  voice?: { main?: string; second?: string; rate?: number };
  cards: Record<string, Card>;
  missions: Record<string, { completedAt: string; score: number }>;
  /** Ancien format (un seul appareil) : migré vers devDaily. */
  daily: Record<string, number>;
  /** Temps actif par appareil : appareil → AAAA-MM-JJ → secondes. Permet d'additionner téléphone et ordinateur. */
  devDaily?: Record<string, Record<string, number>>;
  errors: ErrorEvent[];
}

const KEY = 'madrid-espanol-v1';

function fresh(): AppState {
  return {
    v: 1,
    createdAt: new Date().toISOString(),
    departure: '2028-11',
    dailyGoalMin: 20,
    cards: {},
    missions: {},
    daily: {},
    devDaily: {},
    errors: [],
  };
}

const DEVICE_KEY = 'madrid-espanol-device';
let deviceIdMem: string | null = null;
export function deviceId(): string {
  if (deviceIdMem) return deviceIdMem;
  try {
    deviceIdMem = localStorage.getItem(DEVICE_KEY);
    if (!deviceIdMem) {
      deviceIdMem = Math.random().toString(36).slice(2, 10);
      localStorage.setItem(DEVICE_KEY, deviceIdMem);
    }
  } catch {
    deviceIdMem = Math.random().toString(36).slice(2, 10);
  }
  return deviceIdMem;
}

export function revive(raw: string): AppState {
  const s = JSON.parse(raw) as AppState;
  s.devDaily ??= {};
  if (s.daily && Object.keys(s.daily).length) {
    const mine = (s.devDaily[deviceId()] ??= {});
    for (const [d, v] of Object.entries(s.daily)) mine[d] = Math.max(mine[d] ?? 0, v);
    s.daily = {};
  }
  s.daily ??= {};
  for (const c of Object.values(s.cards)) {
    c.due = new Date(c.due);
    if (c.last_review) c.last_review = new Date(c.last_review);
  }
  return s;
}

let memory: string | null = null;
function read(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return revive(raw);
  } catch {
    if (memory) return revive(memory);
  }
  return fresh();
}

let state: AppState = read();
const listeners = new Set<() => void>();

export function getState() {
  return state;
}

const changeListeners = new Set<() => void>();
/** Abonnement aux modifications faites par l'utilisateur (pas par la synchronisation). */
export function onUserChange(fn: () => void) {
  changeListeners.add(fn);
  return () => {
    changeListeners.delete(fn);
  };
}

export function update(fn: (s: AppState) => void) {
  const next: AppState = structuredClone(state);
  fn(next);
  commit(next);
  changeListeners.forEach((l) => l());
}

/** Remplace l'état (après fusion avec une autre copie), sans déclencher de nouvelle synchronisation. */
export function replaceState(next: AppState) {
  commit(next);
}

function commit(next: AppState) {
  state = next;
  const raw = JSON.stringify(state);
  memory = raw;
  try {
    localStorage.setItem(KEY, raw);
  } catch {
    /* stockage indisponible : on garde la session en mémoire */
  }
  listeners.forEach((l) => l());
}

export function useAppState(): AppState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

export function resetAll() {
  state = fresh();
  update(() => {});
}

export function exportBackup(): string {
  return JSON.stringify(state, null, 2);
}

export function importBackup(raw: string) {
  state = revive(raw);
  update(() => {});
}

export const today = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function addActiveSeconds(sec: number) {
  update((s) => {
    const k = today();
    const mine = ((s.devDaily ??= {})[deviceId()] ??= {});
    mine[k] = (mine[k] ?? 0) + sec;
  });
}

export function logError(cat: ErrorCat, item: string, session: string) {
  update((s) => {
    s.errors.push({ cat, item, session, at: new Date().toISOString() });
    if (s.errors.length > 2000) s.errors = s.errors.slice(-2000);
  });
}

/**
 * Difficulté persistante : ≥ 3 erreurs d'une même catégorie,
 * réparties sur ≥ 2 sessions, au cours des 14 derniers jours.
 */
export function persistentDifficulties(s: AppState) {
  const since = Date.now() - 14 * 864e5;
  const byCat = new Map<ErrorCat, { n: number; sessions: Set<string>; items: Set<string> }>();
  for (const e of s.errors) {
    if (new Date(e.at).getTime() < since) continue;
    const b = byCat.get(e.cat) ?? { n: 0, sessions: new Set(), items: new Set() };
    b.n++;
    b.sessions.add(e.session);
    b.items.add(e.item);
    byCat.set(e.cat, b);
  }
  return [...byCat.entries()]
    .filter(([, b]) => b.n >= 3 && b.sessions.size >= 2)
    .map(([cat, b]) => ({ cat, n: b.n, items: [...b.items].slice(0, 3) }));
}

/** Temps actif par jour, tous appareils confondus. */
export function dailyTotals(s: AppState): Record<string, number> {
  const out: Record<string, number> = { ...s.daily };
  for (const dev of Object.values(s.devDaily ?? {})) for (const [d, v] of Object.entries(dev)) out[d] = (out[d] ?? 0) + v;
  return out;
}

/**
 * Fusionne deux copies de la progression (ex. téléphone et ordinateur).
 * Sans conflit : pour chaque phrase, la révision la plus récente l'emporte ;
 * missions : meilleur score ; temps : maximum par appareil et par jour ; erreurs : union.
 * Les réglages propres à l'appareil (voix, objectif) restent ceux de « local ».
 */
export function mergeStates(local: AppState, remote: AppState): AppState {
  const out = structuredClone(local);
  const t = (d?: Date) => (d ? new Date(d).getTime() : 0);
  for (const [id, rc] of Object.entries(remote.cards ?? {})) {
    const lc = out.cards[id];
    if (!lc || t(rc.last_review) > t(lc.last_review) || (t(rc.last_review) === t(lc.last_review) && rc.reps > lc.reps)) out.cards[id] = rc;
  }
  for (const [id, rm] of Object.entries(remote.missions ?? {})) {
    const lm = out.missions[id];
    out.missions[id] = !lm ? rm : { completedAt: lm.completedAt < rm.completedAt ? lm.completedAt : rm.completedAt, score: Math.max(lm.score, rm.score) };
  }
  out.devDaily ??= {};
  for (const [dev, days] of Object.entries(remote.devDaily ?? {})) {
    const mine = (out.devDaily[dev] ??= {});
    for (const [d, v] of Object.entries(days)) mine[d] = Math.max(mine[d] ?? 0, v);
  }
  const key = (e: ErrorEvent) => `${e.at}|${e.cat}|${e.item}`;
  const seen = new Set(out.errors.map(key));
  for (const e of remote.errors ?? []) if (!seen.has(key(e))) { out.errors.push(e); seen.add(key(e)); }
  out.errors.sort((a, b) => a.at.localeCompare(b.at));
  if (out.errors.length > 2000) out.errors = out.errors.slice(-2000);
  if (remote.createdAt && remote.createdAt < out.createdAt) out.createdAt = remote.createdAt;
  return out;
}

/** Version partagée (sans les réglages propres à l'appareil). */
export function shareable(s: AppState) {
  const { voice: _voice, ...rest } = s;
  return rest;
}
