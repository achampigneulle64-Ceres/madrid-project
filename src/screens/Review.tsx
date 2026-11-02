import { useMemo, useState } from 'react';
import type { Grade } from 'ts-fsrs';
import { chunkById } from '../data/missions';
import { Gendered, SpeakButton, useActiveTimer } from '../components/ui';
import { IconCheck, IconClose } from '../components/icons';
import { speak } from '../lib/speech';
import { getState, update } from '../lib/store';
import { grade, isDue, previewIntervals, Rating } from '../lib/srs';
import { shuffle } from '../lib/text';

type Mode = 'produce' | 'listen';

export function ReviewScreen({ onExit }: { onExit: () => void }) {
  useActiveTimer();
  const initial = useMemo(() => {
    const s = getState();
    const now = new Date();
    const due = Object.entries(s.cards)
      .filter(([, c]) => isDue(c, now))
      .sort((a, b) => a[1].due.getTime() - b[1].due.getTime())
      .map(([id]) => id);
    return { ids: due, practice: false };
  }, []);
  const [queue, setQueue] = useState<string[]>(initial.ids);
  const [practice, setPractice] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);
  const [requeued, setRequeued] = useState<Set<string>>(new Set());

  const id = queue[0];
  const chunk = id ? chunkById[id] : undefined;
  const card = id ? getState().cards[id] : undefined;
  const mode: Mode = card && card.reps % 2 === 1 ? 'listen' : 'produce';

  function startPractice() {
    const ids = shuffle(Object.keys(getState().cards)).slice(0, 10);
    setPractice(true);
    setQueue(ids);
    setDone(0);
  }

  function rate(g: Grade) {
    if (!id) return;
    if (!practice) update((s) => { s.cards[id] = grade(s.cards[id], g); });
    const rest = queue.slice(1);
    if (g === Rating.Again && !requeued.has(id)) {
      rest.push(id); // on la revoit en fin de séance
      setRequeued(new Set(requeued).add(id));
    }
    setQueue(rest);
    setRevealed(false);
    setDone(done + 1);
  }

  if (!chunk || !card) {
    const has = Object.keys(getState().cards).length > 0;
    return (
      <div className="screen focus">
        <div className="card hero center">
          <div className="done-mark"><IconCheck size={34} /></div>
          <h2>{done > 0 ? `${done} révision${done > 1 ? 's' : ''} faite${done > 1 ? 's' : ''}` : 'Rien à réviser'}</h2>
          <p>{has ? 'Tout est à jour. Les phrases reviendront au bon moment, de plus en plus espacées.' : 'Terminez la mission 1 : ses phrases entreront dans vos révisions.'}</p>
          {has && <button className="btn ghost block" onClick={startPractice}>S’entraîner quand même (sans effet sur le planning)</button>}
          <button className="btn primary block" onClick={onExit}>Retour à l’accueil</button>
        </div>
      </div>
    );
  }

  const prev = previewIntervals(card);
  return (
    <div className="screen focus">
      <header className="mission-head">
        <button className="icon-btn" aria-label="Quitter" onClick={onExit}><IconClose /></button>
        <div className="grow">
          <div className="step-label"><b>{practice ? 'Entraînement libre' : 'Révisions'}</b> <span>encore {queue.length}</span></div>
        </div>
      </header>
      <div className="card flash">
        {mode === 'produce' ? (
          <>
            <div className="ex-type">Dites-le en espagnol</div>
            <div className="flash-front">{chunk.fr}</div>
            <p className="hint center">Dites la phrase à voix haute <b>avant</b> de retourner la carte.</p>
          </>
        ) : (
          <>
            <div className="ex-type">Que signifie cette phrase ?</div>
            <div className="big-audio">
              <SpeakButton text={chunk.es} big />
              <SpeakButton text={chunk.es} slow big />
            </div>
            <p className="hint center">Écoutez, puis traduisez mentalement.</p>
          </>
        )}
        {revealed && (
          <div className="flash-back">
            <div className="es big"><Gendered text={chunk.es} /> <SpeakButton text={chunk.es} /></div>
            <div className="fr">{chunk.fr}</div>
            {chunk.note && <div className="note">{chunk.note}</div>}
          </div>
        )}
      </div>
      {!revealed ? (
        <button className="btn primary block" onClick={() => { setRevealed(true); if (mode === 'produce') speak(chunk.es); }}>Voir la réponse</button>
      ) : (
        <>
          <p className="hint center">Comment ça s’est passé ?</p>
          <div className="grades">
            <button className="grade again" onClick={() => rate(Rating.Again)}><b>Raté</b><span>{prev[Rating.Again]}</span></button>
            <button className="grade hard" onClick={() => rate(Rating.Hard)}><b>Difficile</b><span>{prev[Rating.Hard]}</span></button>
            <button className="grade good" onClick={() => rate(Rating.Good)}><b>Bien</b><span>{prev[Rating.Good]}</span></button>
            <button className="grade easy" onClick={() => rate(Rating.Easy)}><b>Facile</b><span>{prev[Rating.Easy]}</span></button>
          </div>
          {!practice && <p className="hint center small">Sous chaque bouton : quand la phrase reviendra.</p>}
        </>
      )}
    </div>
  );
}
