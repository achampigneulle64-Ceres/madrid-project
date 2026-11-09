import { useEffect, useState } from 'react';
import { listVoices, onVoicesChange, resolveVoices, speak, ttsAvailable, type VoiceInfo } from '../lib/speech';
import { update, useAppState } from '../lib/store';
import { IconSpeaker } from './icons';

const SAMPLE_MAIN = 'Hola, buenas. ¿Qué te pongo?';
const SAMPLE_SECOND = 'Quería una caña, por favor.';
const QUALITY = ['standard', 'améliorée', 'premium'];

export function VoiceSettings() {
  const s = useAppState();
  const [voices, setVoices] = useState<VoiceInfo[]>(() => listVoices());
  useEffect(() => onVoicesChange(() => setVoices([...listVoices()])), []);
  const { main, second } = resolveVoices();
  const best = Math.max(-1, ...voices.map((v) => v.quality));
  const rate = s.voice?.rate ?? 0.95;

  function set(key: 'main' | 'second', id: string) {
    update((st) => { st.voice = { ...st.voice, [key]: id }; });
    speak(key === 'main' ? SAMPLE_MAIN : SAMPLE_SECOND, { voiceId: id });
  }

  if (!ttsAvailable()) return <p className="aside">La synthèse vocale n’est pas disponible sur cet appareil.</p>;

  return (
    <div className="voice-settings">
      {voices.length === 0 ? (
        <p className="aside">Aucune voix espagnole trouvée. Installez-en une dans les Réglages de l’iPhone (voir ci-dessous).</p>
      ) : (
        <>
          <VoicePicker label="Voix principale" help="Serveur, phrases clés, révisions" value={main?.id} voices={voices} onChange={(id) => set('main', id)} sample={SAMPLE_MAIN} />
          <VoicePicker label="Seconde voix" help="Vos répliques dans les dialogues" value={second?.id} voices={voices} onChange={(id) => set('second', id)} sample={SAMPLE_SECOND} />
        </>
      )}

      <div className="field">
        <div className="field-label">Débit</div>
        <div className="seg">
          {[
            { v: 0.85, l: 'Posé' },
            { v: 0.95, l: 'Naturel' },
            { v: 1.05, l: 'Rapide' },
          ].map((o) => (
            <button key={o.v} className={Math.abs(rate - o.v) < 0.01 ? 'on' : ''} onClick={() => { update((st) => { st.voice = { ...st.voice, rate: o.v }; }); speak(SAMPLE_MAIN); }}>
              {o.l}
            </button>
          ))}
        </div>
      </div>

      {best < 2 && (
        <div className="tip">
          <b>Pour des voix bien plus naturelles</b>
          <p>
            Sur l’iPhone : <i>Réglages → Accessibilité → Contenu énoncé → Voix → Espagnol</i>. Téléchargez une voix marquée
            <b> Premium</b> ou, à défaut, <b>Améliorée</b>, pour l’Espagne et pour le Mexique. Revenez ensuite ici : elle sera choisie automatiquement.
          </p>
          <p>Sur Mac : <i>Réglages Système → Accessibilité → Contenu énoncé → Voix du système → Gérer les voix → Espagnol</i>.</p>
          <p className="small muted">Ces voix fonctionnent hors ligne et sont gratuites. Comptez 100 à 400 Mo par voix.</p>
        </div>
      )}
    </div>
  );
}

function VoicePicker({ label, help, value, voices, onChange, sample }: { label: string; help: string; value?: string; voices: VoiceInfo[]; onChange: (id: string) => void; sample: string }) {
  const current = voices.find((v) => v.id === value);
  return (
    <div className="field">
      <div className="field-label">{label} <span>{help}</span></div>
      <div className="row nowrap">
        <select className="select grow" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          {voices.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}, {v.region} ({QUALITY[v.quality]})
            </option>
          ))}
        </select>
        <button className="speak" aria-label="Écouter cette voix" onClick={() => speak(sample, { voiceId: value })}><IconSpeaker size={18} /></button>
      </div>
      {current && current.quality === 0 && <p className="small muted">Voix standard : la qualité sera nettement meilleure avec une voix Premium ou Améliorée.</p>}
    </div>
  );
}
