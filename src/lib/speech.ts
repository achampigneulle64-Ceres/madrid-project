import { getState } from './store';

/**
 * Synthèse vocale : on n'utilise que les voix espagnoles de bonne qualité.
 * Sur iPhone, getVoices() renvoie aussi des voix « fantaisie » ou très robotiques
 * (Eddy, Flo, Grandma, Rocko… et les voix Eloquence). Elles sont exclues.
 */

const NOVELTY = new Set(
  [
    'eddy', 'flo', 'grandma', 'grandpa', 'reed', 'rocko', 'sandy', 'shelley',
    'albert', 'bad news', 'bahh', 'bells', 'boing', 'bubbles', 'cellos', 'good news', 'jester',
    'organ', 'superstar', 'trinoids', 'whisper', 'wobble', 'zarvox', 'fred', 'junior', 'kathy', 'ralph',
  ],
);

const FEMALE = /m[oó]nica|marisol|paulina|ang[eé]lica|isabela|francisca|soledad|ximena|lupe|elvira|dalia|helena|laura|sabina|esperanza|luciana|camila|valentina/i;
const MALE = /jorge|juan|diego|carlos|enrique|pablo|alvaro|álvaro|jose|josé|andr[eé]s|miguel|javier|manuel|rodrigo/i;

export interface VoiceInfo {
  id: string; // voiceURI
  name: string; // nom affiché, nettoyé
  lang: string; // es-ES, es-MX…
  region: string; // Espagne, Mexique…
  quality: 0 | 1 | 2; // 0 standard · 1 améliorée · 2 premium
  gender?: 'f' | 'm';
  voice: SpeechSynthesisVoice;
}

const REGIONS: Record<string, string> = {
  'es-es': 'Espagne', 'es-mx': 'Mexique', 'es-us': 'États-Unis', 'es-ar': 'Argentine', 'es-co': 'Colombie', 'es-cl': 'Chili',
};

function normLang(l: string) {
  return l.toLowerCase().replace('_', '-');
}

function qualityOf(v: SpeechSynthesisVoice): 0 | 1 | 2 {
  const s = `${v.voiceURI} ${v.name}`.toLowerCase();
  if (s.includes('premium')) return 2;
  if (s.includes('enhanced') || s.includes('améliorée') || s.includes('mejorada') || s.includes('neural') || s.includes('natural')) return 1;
  return 0;
}

function cleanName(v: SpeechSynthesisVoice) {
  return v.name.replace(/\s*\((premium|enhanced|améliorée|mejorada|compact)\)\s*/gi, '').trim();
}

let voices: VoiceInfo[] = [];
const listeners = new Set<() => void>();

function refresh() {
  if (!ttsAvailable()) return;
  const seen = new Set<string>();
  voices = speechSynthesis
    .getVoices()
    .filter((v) => normLang(v.lang).startsWith('es'))
    .filter((v) => !NOVELTY.has(cleanName(v).toLowerCase()) && !v.voiceURI.toLowerCase().includes('eloquence'))
    .map((v): VoiceInfo => {
      const name = cleanName(v);
      const lang = normLang(v.lang);
      return {
        id: v.voiceURI,
        name,
        lang,
        region: REGIONS[lang] ?? lang,
        quality: qualityOf(v),
        gender: FEMALE.test(name) ? 'f' : MALE.test(name) ? 'm' : undefined,
        voice: v,
      };
    })
    .filter((v) => (seen.has(v.id) ? false : (seen.add(v.id), true)))
    .sort((a, b) => b.quality - a.quality || regionRank(a.lang) - regionRank(b.lang) || a.name.localeCompare(b.name));
  listeners.forEach((l) => l());
}

function regionRank(lang: string) {
  return lang === 'es-es' ? 0 : lang === 'es-mx' ? 1 : 2;
}

export const ttsAvailable = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

if (ttsAvailable()) {
  refresh();
  speechSynthesis.addEventListener?.('voiceschanged', refresh);
  // Safari charge parfois les voix en différé.
  setTimeout(refresh, 600);
  setTimeout(refresh, 2000);
}

export function listVoices() {
  if (!voices.length) refresh();
  return voices;
}

export function onVoicesChange(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Choix automatique : meilleure qualité, Espagne d'abord ; seconde voix de l'autre genre si possible. */
export function resolveVoices(): { main?: VoiceInfo; second?: VoiceInfo } {
  const all = listVoices();
  const pref = getState().voice ?? {};
  const main = all.find((v) => v.id === pref.main) ?? all[0];
  let second = all.find((v) => v.id === pref.second);
  if (!second && main) {
    const others = all.filter((v) => v.id !== main.id);
    second =
      others.find((v) => v.lang === main.lang && v.gender && main.gender && v.gender !== main.gender) ??
      others.find((v) => v.lang === main.lang) ??
      others[0];
  }
  return { main, second };
}

/**
 * Lit un texte en espagnol.
 * voice 0 = voix principale (serveur, phrases), 1 = seconde voix (vous, dans les dialogues).
 */
export function speak(text: string, opts: { slow?: boolean; voice?: 0 | 1; voiceId?: string } = {}): Promise<void> {
  return new Promise((resolve) => {
    if (!ttsAvailable()) return resolve();
    speechSynthesis.cancel();
    const { main, second } = resolveVoices();
    const chosen = opts.voiceId ? listVoices().find((v) => v.id === opts.voiceId) : opts.voice === 1 ? (second ?? main) : main;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = chosen?.voice.lang ?? 'es-ES';
    try {
      if (chosen) u.voice = chosen.voice;
    } catch {
      /* voix refusée par le navigateur : on garde la langue seule */
    }
    const base = getState().voice?.rate ?? 0.95;
    u.rate = opts.slow ? Math.min(base, 0.95) * 0.74 : base;
    u.pitch = 1;
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    u.onend = finish;
    u.onerror = finish;
    // Filet de sécurité si Safari n'émet pas « end ».
    setTimeout(finish, 1500 + text.length * 160);
    speechSynthesis.speak(u);
  });
}

export function stopSpeaking() {
  if (ttsAvailable()) speechSynthesis.cancel();
}

export const micAvailable = () =>
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
