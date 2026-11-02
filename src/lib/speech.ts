let voices: SpeechSynthesisVoice[] = [];

function refresh() {
  if (!('speechSynthesis' in window)) return;
  const all = speechSynthesis.getVoices();
  const es = all.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('es'));
  // Espagne d'abord, puis Mexique, puis le reste.
  const rank = (v: SpeechSynthesisVoice) => {
    const l = v.lang.toLowerCase().replace('_', '-');
    return l === 'es-es' ? 0 : l === 'es-mx' ? 1 : 2;
  };
  voices = es.sort((a, b) => rank(a) - rank(b));
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refresh();
  speechSynthesis.addEventListener?.('voiceschanged', refresh);
}

export const ttsAvailable = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

/**
 * Lit un texte en espagnol.
 * voice 0 = voix principale (Espagne), 1 = seconde voix (pour les dialogues).
 */
export function speak(text: string, opts: { slow?: boolean; voice?: 0 | 1 } = {}): Promise<void> {
  return new Promise((resolve) => {
    if (!ttsAvailable()) return resolve();
    if (!voices.length) refresh();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES';
    const second = opts.voice === 1;
    const sameLang = voices.filter((v) => v.lang.toLowerCase().replace('_', '-') === 'es-es');
    const pool = sameLang.length ? sameLang : voices;
    const v = second ? (pool[1] ?? pool[0]) : pool[0];
    if (v) {
      u.voice = v;
      u.lang = v.lang;
    }
    if (second && pool.length < 2) u.pitch = 1.25; // une seule voix : on la différencie
    u.rate = opts.slow ? 0.65 : 0.92;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    speechSynthesis.speak(u);
  });
}

export function stopSpeaking() {
  if (ttsAvailable()) speechSynthesis.cancel();
}

export const micAvailable = () =>
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
