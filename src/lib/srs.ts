import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from 'ts-fsrs';

/** Rétention visée 90 % ; premiers intervalles en jours (pas d'étapes en minutes). */
export const scheduler = fsrs({ request_retention: 0.9, enable_short_term: false, enable_fuzz: true });

export { Rating };

export function grade(card: Card | undefined, g: Grade, now = new Date()): Card {
  return scheduler.next(card ?? createEmptyCard(now), now, g).card;
}

export function isDue(card: Card, now = new Date()) {
  return card.due.getTime() <= now.getTime();
}

/** « Solide » = en révision et stable au moins 3 semaines. */
export function isSolid(card: Card) {
  return card.state === State.Review && card.stability >= 21;
}

export function intervalLabel(due: Date, now = new Date()) {
  const days = Math.round((due.getTime() - now.getTime()) / 864e5);
  if (days <= 0) return 'aujourd’hui';
  if (days === 1) return 'demain';
  if (days < 14) return `${days} j`;
  if (days < 60) return `${Math.round(days / 7)} sem.`;
  if (days < 365) return `${Math.round(days / 30)} mois`;
  return `${(days / 365).toFixed(1).replace('.', ',')} an`;
}

export function previewIntervals(card: Card, now = new Date()) {
  const p = scheduler.repeat(card, now);
  return {
    [Rating.Again]: intervalLabel(p[Rating.Again].card.due, now),
    [Rating.Hard]: intervalLabel(p[Rating.Hard].card.due, now),
    [Rating.Good]: intervalLabel(p[Rating.Good].card.due, now),
    [Rating.Easy]: intervalLabel(p[Rating.Easy].card.due, now),
  } as Record<Grade, string>;
}
