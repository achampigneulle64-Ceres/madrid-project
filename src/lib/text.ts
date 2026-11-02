export function normalize(s: string, stripAccents = false) {
  let t = s
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/[¿?¡!.,;:«»"()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (stripAccents) t = t.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return t;
}

export type CheckResult = 'ok' | 'accents' | 'wrong';

/** Compare une réponse saisie aux réponses acceptées (ponctuation et majuscules ignorées). */
export function check(answer: string, accepted: string[]): CheckResult {
  const a = normalize(answer);
  if (accepted.some((x) => normalize(x) === a)) return 'ok';
  const b = normalize(answer, true);
  if (accepted.some((x) => normalize(x, true) === b)) return 'accents';
  return 'wrong';
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
