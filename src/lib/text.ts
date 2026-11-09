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

export type Verdict = {
  /** exact · accents oubliés · faute de frappe · politesse oubliée · faux */
  level: 'exact' | 'accents' | 'typo' | 'polite' | 'wrong';
  expected: string;
};

const COURTESY = /\b(por favor|gracias|hola|si)\b/g;
const core = (s: string) => normalize(s, true).replace(COURTESY, ' ').replace(/\s+/g, ' ').trim();

export function levenshtein(a: string, b: string) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

const ARTICLES = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas']);
/** Une erreur d'article (el/la, un/una) est une erreur de grammaire, jamais une faute de frappe. */
function articleMismatch(a: string, b: string) {
  const ta = a.split(' '), tb = b.split(' ');
  const artsA = ta.filter((w) => ARTICLES.has(w)).join(' ');
  const artsB = tb.filter((w) => ARTICLES.has(w)).join(' ');
  if (artsA !== artsB) return true;
  // Accord masculin / féminin : francés/francesa, mexicano/mexicana, español/española…
  if (ta.length !== tb.length) return false;
  return ta.some((x, i) => {
    const y = tb[i];
    if (x === y) return false;
    const fem = (m: string, f: string) => (m.endsWith('o') && f === m.slice(0, -1) + 'a') || f === m + 'a' || (m.endsWith('es') && f === m + 'a');
    return fem(x, y) || fem(y, x);
  });
}

/** Tolérance : 1 faute pour 8 caractères (au moins 1). */
const tolerance = (s: string) => Math.max(1, Math.floor(s.length / 8));

/**
 * Évalue une réponse écrite avec une marge d'erreur raisonnable :
 * ponctuation et majuscules ignorées, accents oubliés acceptés (signalés),
 * petites fautes de frappe acceptées, formule de politesse oubliée acceptée (signalée).
 */
export function evaluate(answer: string, accepted: string[]): Verdict {
  const a = normalize(answer);
  const as = normalize(answer, true);
  for (const x of accepted) if (normalize(x) === a) return { level: 'exact', expected: x };
  for (const x of accepted) if (normalize(x, true) === as) return { level: 'accents', expected: x };
  for (const x of accepted) {
    const xs = normalize(x, true);
    if (!articleMismatch(as, xs) && levenshtein(as, xs) <= tolerance(xs)) return { level: 'typo', expected: x };
  }
  const ac = core(answer);
  if (ac) {
    for (const x of accepted) {
      const xc = core(x);
      if (xc && !articleMismatch(ac, xc) && levenshtein(ac, xc) <= tolerance(xc) - (xc.length < 8 ? 1 : 0)) return { level: 'polite', expected: x };
    }
  }
  const closest = [...accepted].sort((x, y) => levenshtein(as, normalize(x, true)) - levenshtein(as, normalize(y, true)))[0];
  return { level: 'wrong', expected: closest };
}

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
