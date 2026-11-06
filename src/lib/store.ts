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
  daily: Record<string, number>; // AAAA-MM-JJ → secondes actives
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
    errors: [],
  };
}

function revive(raw: string): AppState {
  const s = JSON.parse(raw) as AppState;
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

export function update(fn: (s: AppState) => void) {
  const next: AppState = structuredClone(state);
  fn(next);
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
    s.daily[k] = (s.daily[k] ?? 0) + sec;
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
