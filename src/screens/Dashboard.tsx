import { a1Path, missions } from '../data/missions';
import { IconCheck, IconLock, IconPlane } from '../components/icons';
import { persistentDifficulties, today, useAppState } from '../lib/store';
import { isDue, isSolid } from '../lib/srs';

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export function Dashboard({ openMission, openReview }: { openMission: (id: string) => void; openReview: () => void }) {
  const s = useAppState();
  const now = new Date();
  const cards = Object.values(s.cards);
  const due = cards.filter((c) => isDue(c, now)).length;
  const solid = cards.filter(isSolid).length;
  const minToday = Math.floor((s.daily[today()] ?? 0) / 60);
  const totalMin = Math.floor(Object.values(s.daily).reduce((a, b) => a + b, 0) / 60);
  const doneMissions = Object.keys(s.missions).length;
  const a1Chunks = a1Path.length * 12;
  const a1Progress = Math.min(1, 0.6 * (doneMissions / a1Path.length) + 0.4 * (solid / a1Chunks));
  const difficulties = persistentDifficulties(s);

  const [y, m] = s.departure.split('-').map(Number);
  const monthsLeft = (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth());
  const nextMission = missions.find((x) => !s.missions[x.id]);
  const week = lastDays(7).map((d) => Math.round((s.daily[d] ?? 0) / 60));
  const weekMin = week.reduce((a, b) => a + b, 0);
  const goal = s.dailyGoalMin;

  // Position sur la route A1 → A2 → B1 (A1 = premier tiers)
  const routePos = a1Progress / 2;

  return (
    <div className="screen dash">
      <p className="greeting">
        <span className="date">{now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        <span className="hola">¡Hola!</span>
      </p>

      <section className="pass" aria-label="Votre départ">
        <div className="pass-main">
          <div className="route-codes">
            <div>
              <div className="code">PAR</div>
              <div className="city">Paris</div>
            </div>
            <div className="flight">
              <span className="dash-line" />
              <IconPlane size={20} className="plane" />
              <span className="dash-line" />
            </div>
            <div className="right">
              <div className="code">MAD<span className="alt">/MEX</span></div>
              <div className="city">Madrid ou Mexico</div>
            </div>
          </div>
          <dl className="pass-fields">
            <div><dt>Départ</dt><dd>{MONTHS[m - 1]} {y}</dd></div>
            <div><dt>Dans</dt><dd>{monthsLeft} mois</dd></div>
            <div><dt>Niveau visé</dt><dd>B1</dd></div>
          </dl>
        </div>
        <div className="perforation" aria-hidden="true" />
        <div className="pass-stub">
          <div className="levels">
            <div className="level-track">
              <div className="level-fill" style={{ width: `${routePos * 100}%` }} />
              <div className="level-dot" style={{ left: `${routePos * 100}%` }} />
            </div>
            <div className="level-marks">
              <span className="on">A1</span>
              <span>A2</span>
              <span>B1</span>
            </div>
          </div>
          <p className="level-text">
            Niveau estimé <b>A1</b>, {Math.round(a1Progress * 100)} % du chemin vers A2
          </p>
        </div>
      </section>

      <section className="panel today">
        <div className="panel-head">
          <h2>Aujourd’hui</h2>
          <span className="minutes"><b>{minToday}</b> / {goal} min</span>
        </div>
        <div className="thin-track"><div style={{ width: `${Math.min(100, (minToday / goal) * 100)}%` }} /></div>
        <ol className="plan">
          <li className={due === 0 && cards.length ? 'done' : ''}>
            <span className="plan-n">{due === 0 && cards.length ? <IconCheck size={14} /> : '1'}</span>
            <span className="plan-t">Révisions</span>
            <span className="plan-d">{due === 0 ? (cards.length ? 'à jour' : 'après la mission 1') : `${due} phrase${due > 1 ? 's' : ''}`}</span>
          </li>
          <li className={!nextMission ? 'done' : ''}>
            <span className="plan-n">{!nextMission ? <IconCheck size={14} /> : '2'}</span>
            <span className="plan-t">{nextMission ? `Mission ${nextMission.number}` : 'Missions disponibles'}</span>
            <span className="plan-d">{nextMission ? nextMission.titleEs : 'terminées'}</span>
          </li>
          <li>
            <span className="plan-n">3</span>
            <span className="plan-t">Écoute et répétition</span>
            <span className="plan-d">dans la mission</span>
          </li>
        </ol>
        {due > 0 ? (
          <button className="btn primary block" onClick={openReview}>Réviser {due} phrase{due > 1 ? 's' : ''}</button>
        ) : nextMission ? (
          <button className="btn primary block" onClick={() => openMission(nextMission.id)}>
            {doneMissions === 0 ? 'Commencer la mission 1' : `Continuer la mission ${nextMission.number}`}
          </button>
        ) : (
          <button className="btn secondary block" onClick={openReview}>S’entraîner librement</button>
        )}
        <p className="aside">Journée chargée ? Cinq minutes de révision suffisent à garder le fil.</p>
      </section>

      <section className="figures">
        <div><b>{cards.length}</b><span>phrases apprises</span></div>
        <div><b>{solid}</b><span>phrases solides</span></div>
        <div><b>{formatMin(totalMin)}</b><span>de travail</span></div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Cette semaine</h2>
          <span className="minutes">{formatMin(weekMin)}</span>
        </div>
        <div className="week">
          {week.map((v, k) => (
            <div key={k} className={`wk ${k === 6 ? 'today' : ''}`}>
              <div className="wk-bar"><div style={{ height: `${Math.min(100, (v / goal) * 100)}%` }} /></div>
              <span>{dayLetter(6 - k)}</span>
            </div>
          ))}
        </div>
        <p className="aside">La barre est pleine quand l’objectif de {goal} minutes est atteint.</p>
      </section>

      <section className="panel">
        <h2>Points de vigilance</h2>
        {difficulties.length === 0 ? (
          <p className="aside">Rien à signaler. Une erreur qui revient sur plusieurs séances apparaîtra ici, avec des exercices ciblés.</p>
        ) : (
          <ul className="cat-list">
            {difficulties.map((d) => <li key={d.cat}><span>{d.cat}</span><b>{d.n} erreurs</b></li>)}
          </ul>
        )}
      </section>

      <section className="itinerary">
        <h2>Itinéraire A1</h2>
        <ol>
          {a1Path.map((p) => {
            const mis = missions.find((x) => x.number === p.number);
            const done = mis && s.missions[mis.id];
            const prev = missions.find((x) => x.number === p.number - 1);
            const unlocked = p.number === 1 || (!!prev && !!s.missions[prev.id]);
            const state = done ? 'done' : mis && unlocked ? 'current' : 'locked';
            const why = !unlocked ? `après la mission ${p.number - 1}` : !mis ? 'en préparation' : '';
            return (
              <li key={p.number} className={state} onClick={() => mis && (done || unlocked) && openMission(mis.id)}>
                <span className="stop">{done ? <IconCheck size={14} /> : p.number}</span>
                <div className="stop-body">
                  <div className="stop-title">{p.titleEs}</div>
                  <div className="stop-sub">{p.title}, {p.place}</div>
                </div>
                {done ? <span className="stop-score">{done.score} %</span> : state === 'locked' ? <span className="stop-why"><IconLock size={14} /> {why}</span> : <span className="stop-go">Ouvrir</span>}
              </li>
            );
          })}
          <li className="locked final">
            <span className="stop">A2</span>
            <div className="stop-body">
              <div className="stop-title">Bilan A1</div>
              <div className="stop-sub">Révision cumulée de toutes les missions</div>
            </div>
          </li>
        </ol>
      </section>
      <p className="footer">Version {__APP_VERSION__} du {__APP_BUILT__}. Votre progression reste sur cet appareil.</p>
    </div>
  );
}

function lastDays(n: number) {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(today(new Date(Date.now() - i * 864e5)));
  return out;
}
function dayLetter(daysAgo: number) {
  return new Date(Date.now() - daysAgo * 864e5).toLocaleDateString('fr-FR', { weekday: 'narrow' });
}
function formatMin(min: number) {
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
}
