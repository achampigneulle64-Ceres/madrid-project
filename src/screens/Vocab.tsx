import { useRef } from 'react';
import { State } from 'ts-fsrs';
import { allChunks } from '../data/missions';
import { Gendered, SpeakButton } from '../components/ui';
import { VoiceSettings } from '../components/VoiceSettings';
import { exportBackup, importBackup, resetAll, useAppState } from '../lib/store';
import { intervalLabel, isSolid } from '../lib/srs';

export function VocabScreen() {
  const s = useAppState();
  const file = useRef<HTMLInputElement>(null);
  const learned = allChunks.filter((c) => s.cards[c.id]);

  async function download() {
    const name = `espanol-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([exportBackup()], name, { type: 'application/json' });
    // Sur iPhone : la feuille de partage permet « Enregistrer dans Fichiers » (iCloud Drive).
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Sauvegarde Español' });
        return;
      } catch {
        /* partage annulé */
      }
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = name;
    a.click();
  }

  return (
    <div className="screen">
      <h1 className="page-title">Mes phrases</h1>
      {learned.length === 0 ? (
        <div className="card"><p className="muted">Vos phrases apparaîtront ici après la mission 1.</p></div>
      ) : (
        <ul className="chunk-list">
          {learned.map((c) => {
            const card = s.cards[c.id];
            const status = isSolid(card) ? ['solide', 'st-solid'] : card.state === State.Review ? ['en consolidation', 'st-mid'] : ['en apprentissage', 'st-new'];
            return (
              <li key={c.id} className="chunk">
                <div className="grow">
                  <div className="es"><Gendered text={c.es} /></div>
                  <div className="fr">{c.fr}</div>
                  <div className="meta">
                    <span className={`status ${status[1]}`}>{status[0]}</span>
                    <span className="muted small">prochaine révision : {intervalLabel(card.due)}</span>
                  </div>
                </div>
                <div className="audio-col"><SpeakButton text={c.es} /></div>
              </li>
            );
          })}
        </ul>
      )}

      <section className="card">
        <h2>Voix</h2>
        <VoiceSettings />
      </section>

      <section className="card">
        <h2>Sauvegarde</h2>
        <p className="muted">Votre progression est stockée uniquement sur ce téléphone. Chaque semaine, exportez-la puis choisissez « Enregistrer dans Fichiers » → iCloud Drive.</p>
        <div className="row">
          <button className="btn ghost grow" onClick={download}>Exporter</button>
          <button className="btn ghost grow" onClick={() => file.current?.click()}>Importer</button>
        </div>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try { importBackup(await f.text()); } catch { /* fichier invalide */ }
        }} />
        <button className="link danger" onClick={() => { if (window.confirm('Effacer toute la progression ?')) resetAll(); }}>Réinitialiser la progression</button>
      </section>
    </div>
  );
}
