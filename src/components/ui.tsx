import { useEffect, useRef, useState } from 'react';
import { micAvailable, speak } from '../lib/speech';
import { addActiveSeconds } from '../lib/store';
import { IconMic, IconPlay, IconSlow, IconSpeaker, IconStop } from './icons';

export function SpeakButton({ text, slow, voice, label, big }: { text: string; slow?: boolean; voice?: 0 | 1; label?: string; big?: boolean }) {
  const [playing, setPlaying] = useState(false);
  return (
    <button
      className={`speak ${playing ? 'playing' : ''} ${slow ? 'slow' : ''} ${big ? 'big' : ''}`}
      aria-label={label ?? (slow ? 'Écouter lentement' : 'Écouter')}
      onClick={async (e) => {
        e.stopPropagation();
        setPlaying(true);
        await speak(text, { slow, voice });
        setPlaying(false);
      }}
    >
      {slow ? <IconSlow size={big ? 24 : 18} /> : <IconSpeaker size={big ? 24 : 18} />}
      {big ? <span>{slow ? 'Lentement' : 'Écouter'}</span> : slow ? <span className="speak-tag">lent</span> : null}
    </button>
  );
}

/** Enregistre la voix de l'utilisateur pour la comparer au modèle. */
export function Recorder({ onDone }: { onDone?: () => void }) {
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!micAvailable())
    return <p className="hint">Micro indisponible ici : répétez simplement à voix haute, deux fois.</p>;

  async function start() {
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      const parts: Blob[] = [];
      r.ondataavailable = (e) => parts.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(parts, { type: r.mimeType || 'audio/mp4' });
        setUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(blob);
        });
        onDone?.();
      };
      r.start();
      setRec(r);
    } catch {
      setErr('Accès au micro refusé. Répétez simplement à voix haute.');
    }
  }

  return (
    <div className="recorder">
      {rec ? (
        <button
          className="btn rec on"
          onClick={() => {
            rec.stop();
            setRec(null);
          }}
        >
          <IconStop size={18} /> Arrêter
        </button>
      ) : (
        <button className="btn rec" onClick={start}>
          <IconMic size={18} /> {url ? 'Recommencer' : 'M’enregistrer'}
        </button>
      )}
      {url && !rec && (
        <button className="btn ghost" onClick={() => new Audio(url).play()}>
          <IconPlay size={16} /> Me réécouter
        </button>
      )}
      {err && <p className="hint">{err}</p>}
    </div>
  );
}

/** Compte le temps d'apprentissage actif (écran visible). */
export function useActiveTimer() {
  const acc = useRef(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') acc.current += 5;
      if (acc.current >= 15) {
        addActiveSeconds(acc.current);
        acc.current = 0;
      }
    }, 5000);
    return () => {
      window.clearInterval(id);
      if (acc.current) addActiveSeconds(acc.current);
      acc.current = 0;
    };
  }, []);
}

export function Progress({ value, tone = 'accent' }: { value: number; tone?: 'accent' | 'teal' | 'gold' }) {
  return (
    <div className="progress">
      <div className={`bar ${tone}`} style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }} />
    </div>
  );
}

/** Colore un/una (et le nom qui suit) selon le genre. */
export function Gendered({ text }: { text: string }) {
  const parts = text.split(/(\buna\b|\bun\b)/i);
  return (
    <>
      {parts.map((p, i) => {
        const low = p.toLowerCase();
        if (low === 'un') return <b key={i} className="masc">{p}</b>;
        if (low === 'una') return <b key={i} className="fem">{p}</b>;
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}
