import { useEffect, useMemo, useState } from 'react';
import type { ErrorCat, Exercise, GrammarSection, Mission as M, RoleplayStep } from '../data/types';
import { Rich } from '../components/Rich';
import { chunkById } from '../data/missions';
import { Gendered, Progress, Recorder, SpeakButton, useActiveTimer } from '../components/ui';
import { IconCheck, IconClose, IconCross, IconPin, IconPlay } from '../components/icons';
import { speak, stopSpeaking } from '../lib/speech';
import { logError, update } from '../lib/store';
import { grade, Rating } from '../lib/srs';
import { evaluate, shuffle, type Verdict } from '../lib/text';

type Step = 'intro' | 'dialogue' | 'grammar' | 'chunks' | 'ex' | 'roleplay' | 'bilan';
const STEPS: Step[] = ['intro', 'dialogue', 'grammar', 'chunks', 'ex', 'roleplay', 'bilan'];
const STEP_LABEL: Record<Step, string> = {
  intro: 'Situation',
  dialogue: 'Écoute',
  grammar: 'Comprendre',
  chunks: 'Les phrases clés',
  ex: 'S’entraîner',
  roleplay: 'En situation',
  bilan: 'Bilan',
};

interface Result {
  total: number;
  ok: number;
  byCat: Partial<Record<ErrorCat, number>>;
  missedChunks: Set<string>;
}

export function MissionScreen({ mission, onExit }: { mission: M; onExit: () => void }) {
  useActiveTimer();
  const session = useMemo(() => `${mission.id}-${Date.now()}`, [mission.id]);
  const [step, setStep] = useState<Step>('intro');
  const [result, setResult] = useState<Result>({ total: 0, ok: 0, byCat: {}, missedChunks: new Set() });
  const idx = STEPS.indexOf(step);
  const next = () => {
    stopSpeaking();
    setStep(STEPS[idx + 1]);
    window.scrollTo(0, 0);
  };

  /** soft = réussi avec aide (2e essai) : compte comme réussi, mais la phrase reviendra plus tôt en révision. */
  function record(ok: boolean, cat: ErrorCat, item: string, chunk?: string, soft = false) {
    setResult((r) => {
      const n: Result = { ...r, total: r.total + 1, ok: r.ok + (ok ? 1 : 0), byCat: { ...r.byCat }, missedChunks: new Set(r.missedChunks) };
      if (!ok) n.byCat[cat] = (n.byCat[cat] ?? 0) + 1;
      if ((!ok || soft) && chunk) n.missedChunks.add(chunk);
      return n;
    });
    if (!ok) logError(cat, item, session);
  }

  function finish() {
    const score = result.total ? Math.round((result.ok / result.total) * 100) : 100;
    update((s) => {
      for (const c of mission.chunks) {
        if (!s.cards[c.id]) s.cards[c.id] = grade(undefined, result.missedChunks.has(c.id) ? Rating.Again : Rating.Good);
      }
      const prev = s.missions[mission.id];
      s.missions[mission.id] = { completedAt: new Date().toISOString(), score: Math.max(score, prev?.score ?? 0) };
    });
    onExit();
  }

  return (
    <div className="screen mission">
      <header className="mission-head">
        <button className="icon-btn" aria-label="Quitter la mission" onClick={() => { stopSpeaking(); onExit(); }}><IconClose /></button>
        <div className="grow">
          <div className="step-label"><b>{STEP_LABEL[step]}</b> <span>étape {idx + 1} sur {STEPS.length}</span></div>
          <div className="segments">{STEPS.map((x, k) => <span key={x} className={k < idx ? 'past' : k === idx ? 'now' : ''} />)}</div>
        </div>
      </header>

      {step === 'intro' && (
        <section className="card hero">
          <div className="place"><IconPin size={16} /> {mission.place}</div>
          <h1>{mission.titleEs}</h1>
          <p className="sub">{mission.title}</p>
          <p>{mission.context}</p>
          <div className="goal">
            <b>Objectif</b>
            <span>{mission.goal}</span>
          </div>
          <ol className="steps-preview">
            <li>Écouter la scène</li>
            <li>{mission.understand}</li>
            <li>Découvrir les {mission.chunks.length} phrases clés</li>
            <li>S’entraîner : écoute, accords, construction, écriture, prononciation</li>
            <li>Jouer la scène</li>
          </ol>
          <p className="hint">Durée : 20 à 30 min. Vous pouvez la faire en deux fois.</p>
          <button className="btn primary block" onClick={next}>Commencer</button>
        </section>
      )}

      {step === 'dialogue' && <DialogueStep mission={mission} onNext={next} />}
      {step === 'grammar' && <GrammarStep sections={mission.grammar} onNext={next} />}
      {step === 'chunks' && <ChunksStep mission={mission} onNext={next} />}
      {step === 'ex' && <ExercisesStep exercises={mission.exercises} record={record} session={session} onNext={next} />}
      {step === 'roleplay' && <RoleplayStepView steps={mission.roleplay} partner={mission.partner} record={record} onNext={next} />}
      {step === 'bilan' && <Bilan mission={mission} result={result} onFinish={finish} />}
    </div>
  );
}

/* ───────── 1. Écoute du dialogue ───────── */
function DialogueStep({ mission, onNext }: { mission: M; onNext: () => void }) {
  const [showFr, setShowFr] = useState(true);
  const [current, setCurrent] = useState<number | null>(null);
  const [slow, setSlow] = useState(false);

  async function playAll() {
    for (let i = 0; i < mission.dialogue.length; i++) {
      setCurrent(i);
      const l = mission.dialogue[i];
      await speak(l.es, { voice: l.who === 'Vous' ? 1 : 0, slow });
      await new Promise((r) => setTimeout(r, 350));
    }
    setCurrent(null);
  }

  return (
    <section>
      <div className="card">
        <h2>Écoutez la scène</h2>
        <p className="hint">Écoutez une première fois en lisant la traduction, puis une seconde fois en la masquant.</p>
        <div className="row">
          <button className="btn primary" onClick={playAll}><IconPlay size={16} /> Écouter la scène</button>
          <label className="toggle"><input type="checkbox" checked={slow} onChange={(e) => setSlow(e.target.checked)} /> Lent</label>
          <label className="toggle"><input type="checkbox" checked={showFr} onChange={(e) => setShowFr(e.target.checked)} /> Traduction</label>
        </div>
      </div>
      <div className="dialogue">
        {mission.dialogue.map((l, i) => (
          <div key={i} className={`bubble ${l.who === 'Vous' ? 'me' : 'them'} ${current === i ? 'active' : ''}`} onClick={() => speak(l.es, { voice: l.who === 'Vous' ? 1 : 0, slow })}>
            <div className="who">{l.who}</div>
            <div className="es">{l.es}</div>
            {showFr && <div className="fr">{l.fr}</div>}
          </div>
        ))}
      </div>
      <p className="hint center">Touchez une réplique pour la réécouter.</p>
      <button className="btn primary block" onClick={onNext}>J’ai compris la scène</button>
    </section>
  );
}

/* ───────── 2. Grammaire visuelle ───────── */
function GrammarStep({ sections, onNext }: { sections: GrammarSection[]; onNext: () => void }) {
  return (
    <section>
      {sections.map((sec) => (
        <div className="card" key={sec.title}>
          <h2>{sec.title}</h2>
          {sec.blocks.map((b, k) => {
            if (b.kind === 'table')
              return (
                <table className="formula" key={k}>
                  <tbody>
                    {b.rows.map(([es, fr]) => (
                      <tr key={es}><td><Rich text={es} /></td><td>{fr}</td></tr>
                    ))}
                  </tbody>
                </table>
              );
            if (b.kind === 'gender')
              return (
                <div className="gender-grid" key={k}>
                  <div className="col masc-bg">
                    <div className="col-title"><Rich text={b.mascLabel} /></div>
                    {b.masc.map((w) => <div key={w}><Rich text={w} /></div>)}
                  </div>
                  <div className="col fem-bg">
                    <div className="col-title"><Rich text={b.femLabel} /></div>
                    {b.fem.map((w) => <div key={w}><Rich text={w} /></div>)}
                  </div>
                </div>
              );
            return (
              <div className={`tip ${b.tone ?? ''}`} key={k}>
                <b>{b.title}</b>
                <p><Rich text={b.text} /></p>
              </div>
            );
          })}
        </div>
      ))}
      <button className="btn primary block" onClick={onNext}>Voir les phrases clés</button>
    </section>
  );
}

/* ───────── 3. Phrases clés ───────── */
function ChunksStep({ mission, onNext }: { mission: M; onNext: () => void }) {
  return (
    <section>
      <div className="card">
        <h2>Les {mission.chunks.length} phrases clés</h2>
        <p className="hint">Pour chacune : écoutez, répétez à voix haute, puis réécoutez la version lente. Elles entreront ensuite dans vos révisions.</p>
      </div>
      <ul className="chunk-list">
        {mission.chunks.map((c) => (
          <li key={c.id} className="chunk">
            <div className="grow">
              <div className="es"><Gendered text={c.es} /></div>
              <div className="fr">{c.fr}</div>
              {c.note && <div className="note">{c.note}</div>}
            </div>
            <div className="audio-col">
              <SpeakButton text={c.es} />
              <SpeakButton text={c.es} slow />
            </div>
          </li>
        ))}
      </ul>
      <button className="btn primary block" onClick={onNext}>Passer aux exercices</button>
    </section>
  );
}

/* ───────── 4. Exercices ───────── */
type Feedback = { ok: boolean; title: string; detail?: string; answer?: string } | null;

function ExercisesStep({ exercises, record, session, onNext }: { exercises: Exercise[]; record: (ok: boolean, cat: ErrorCat, item: string, chunk?: string, soft?: boolean) => void; session: string; onNext: () => void }) {
  const [i, setI] = useState(0);
  const [fb, setFb] = useState<Feedback>(null);
  const ex = exercises[i];

  function answered(f: NonNullable<Feedback>, cat: ErrorCat, item: string, chunk?: string, soft = false) {
    record(f.ok, cat, item, chunk, soft);
    setFb(f);
    if (chunk && chunkById[chunk]) speak(chunkById[chunk].es);
  }
  function go() {
    setFb(null);
    if (i + 1 >= exercises.length) onNext();
    else setI(i + 1);
  }

  return (
    <section>
      <div className="ex-count">Exercice {i + 1} / {exercises.length}</div>
      <Progress value={i / exercises.length} tone="teal" />
      <div className="card ex" key={i}>
        {ex.kind === 'listen' && <ListenEx ex={ex} locked={!!fb} onAnswer={(ok) => answered({ ok, title: ok ? '¡Muy bien!' : 'Pas tout à fait', answer: `${chunkById[ex.chunk].es} = ${ex.options[ex.answer]}` }, 'Compréhension orale', chunkById[ex.chunk].es, ex.chunk)} />}
        {ex.kind === 'gender' && <GenderEx ex={ex} locked={!!fb} onAnswer={(ok) => answered({ ok, title: ok ? '¡Exacto!' : 'Attention au genre', answer: `${ex.answer} ${ex.noun}`, detail: genderWhy(ex.noun) }, 'Genre (un / una)', ex.noun)} />}
        {ex.kind === 'order' && <OrderEx ex={ex} locked={!!fb} onAnswer={(ok, second) => answered({ ok, title: ok ? (second ? 'Réussi au deuxième essai' : '¡Perfecto!') : 'Voici le bon ordre', answer: chunkById[ex.chunk].es }, 'Ordre des mots', chunkById[ex.chunk].es, ex.chunk, ok && second)} />}
        {ex.kind === 'translate' && (
          <TranslateEx
            ex={ex}
            locked={!!fb}
            onAnswer={(v, second) => {
              const c = chunkById[ex.chunk];
              const ok = v.level !== 'wrong';
              const titles: Record<Verdict['level'], string> = {
                exact: second ? 'Réussi au deuxième essai' : '¡Perfecto!',
                accents: 'Juste. Attention aux accents',
                typo: 'Juste, à une petite faute près',
                polite: 'Juste. N’oubliez pas la politesse',
                wrong: 'Voici la bonne réponse',
              };
              const details: Record<Verdict['level'], string | undefined> = {
                exact: undefined,
                accents: 'Le sens est juste ; seuls les accents ou le ñ manquent. Sur iPhone : appui long sur la lettre.',
                typo: 'Comparez avec la forme exacte ci-dessus.',
                polite: 'La phrase est correcte ; avec « por favor » ou « gracias », elle sonne plus naturelle.',
                wrong: 'Lisez-la, écoutez-la, puis répétez-la à voix haute. Elle reviendra bientôt en révision.',
              };
              answered({ ok, title: titles[v.level], answer: v.expected, detail: details[v.level] }, 'Production écrite', c.es, ex.chunk, ok && (second || v.level === 'typo'));
              if (v.level === 'accents') logError('Accents et ñ', c.es, session);
            }}
          />
        )}
        {ex.kind === 'agree' && <AgreeEx ex={ex} locked={!!fb} onAnswer={(ok) => answered({ ok, title: ok ? '¡Exacto!' : 'Attention à l’accord', answer: ex.sentence.replace('___', ex.options[ex.answer]), detail: ex.why }, 'Accord masculin / féminin', ex.sentence)} />}
        {ex.kind === 'shadow' && <ShadowEx ex={ex} onDone={go} />}
      </div>
      {fb && (
        <div className={`feedback ${fb.ok ? 'ok' : 'ko'}`}>
          <div className="fb-title">{fb.ok ? <IconCheck size={20} /> : <IconCross size={20} />} {fb.title}</div>
          {fb.answer && <div className="fb-answer"><Gendered text={fb.answer} /></div>}
          {fb.detail && <div className="fb-detail">{fb.detail}</div>}
          <button className="btn primary block" onClick={go}>Continuer</button>
        </div>
      )}
    </section>
  );
}

function genderWhy(noun: string) {
  if (noun.endsWith('o')) return 'Terminaison en -o → masculin.';
  if (noun.endsWith('ión')) return 'Terminaison en -ión → féminin.';
  if (noun.endsWith('a')) return 'Terminaison en -a → féminin.';
  if (noun === 'café') return 'Café est masculin, comme en français.';
  return '';
}

function ListenEx({ ex, locked, onAnswer }: { ex: Extract<Exercise, { kind: 'listen' }>; locked: boolean; onAnswer: (ok: boolean) => void }) {
  const c = chunkById[ex.chunk];
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <>
      <div className="ex-type">Écoute</div>
      <h3>Que signifie cette phrase ?</h3>
      <div className="big-audio">
        <SpeakButton text={c.es} big />
        <SpeakButton text={c.es} slow big />
      </div>
      <div className="options">
        {ex.options.map((o, k) => (
          <button
            key={k}
            disabled={locked}
            className={`opt ${picked === k ? (k === ex.answer ? 'right' : 'wrong') : ''} ${locked && k === ex.answer ? 'right' : ''}`}
            onClick={() => { setPicked(k); onAnswer(k === ex.answer); }}
          >
            {o}
          </button>
        ))}
      </div>
    </>
  );
}

function GenderEx({ ex, locked, onAnswer }: { ex: Extract<Exercise, { kind: 'gender' }>; locked: boolean; onAnswer: (ok: boolean) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <>
      <div className="ex-type">Genre</div>
      <h3>Un ou una ?</h3>
      <div className="gender-q">
        <span className={`slot ${picked ? (picked === 'un' ? 'masc' : 'fem') : ''}`}>{picked ?? '___'}</span> {ex.noun}
        <div className="fr">({ex.fr})</div>
      </div>
      <div className="options two">
        {(['un', 'una'] as const).map((g) => (
          <button key={g} disabled={locked} className={`opt ${g === 'un' ? 'masc-btn' : 'fem-btn'} ${picked === g ? (g === ex.answer ? 'right' : 'wrong') : ''}`} onClick={() => { setPicked(g); onAnswer(g === ex.answer); }}>
            {g}
          </button>
        ))}
      </div>
    </>
  );
}

function AgreeEx({ ex, locked, onAnswer }: { ex: Extract<Exercise, { kind: 'agree' }>; locked: boolean; onAnswer: (ok: boolean) => void }) {
  const [picked, setPicked] = useState<0 | 1 | null>(null);
  const [before, after] = ex.sentence.split('___');
  return (
    <>
      <div className="ex-type">Accord</div>
      <h3>Masculin ou féminin ?</h3>
      <div className="gender-q agree-q">
        {before}<span className={`slot ${picked === null ? '' : picked === 0 ? 'masc' : 'fem'}`}>{picked === null ? '___' : ex.options[picked]}</span>{after}
        <div className="fr">({ex.fr})</div>
      </div>
      <div className="options two">
        {ex.options.map((o, k) => (
          <button key={o} disabled={locked} className={`opt agree-opt ${k === 0 ? 'masc-btn' : 'fem-btn'} ${picked === k ? (k === ex.answer ? 'right' : 'wrong') : ''} ${locked && k === ex.answer ? 'right' : ''}`} onClick={() => { setPicked(k as 0 | 1); onAnswer(k === ex.answer); }}>
            {o}
          </button>
        ))}
      </div>
    </>
  );
}

function OrderEx({ ex, locked, onAnswer }: { ex: Extract<Exercise, { kind: 'order' }>; locked: boolean; onAnswer: (ok: boolean, second: boolean) => void }) {
  const [tries, setTries] = useState(0);
  const pool = useMemo(() => {
    const idx = ex.tokens.map((_, k) => k);
    let s = shuffle(idx);
    for (let t = 0; t < 5 && s.every((v, k) => v === k); t++) s = shuffle(idx);
    return s;
  }, [ex]);
  const [chosen, setChosen] = useState<number[]>([]);
  const remaining = pool.filter((k) => !chosen.includes(k));
  const done = chosen.length === ex.tokens.length;
  return (
    <>
      <div className="ex-type">Construction</div>
      <h3>Reconstituez la phrase</h3>
      <p className="fr-prompt">« {ex.fr} »</p>
      <div className="build">
        {ex.prefix && <span className="punct">{ex.prefix}</span>}
        {chosen.map((k) => (
          <button key={k} className="tok placed" disabled={locked} onClick={() => setChosen(chosen.filter((x) => x !== k))}>{ex.tokens[k]}</button>
        ))}
        {ex.suffix && done && <span className="punct">{ex.suffix}</span>}
        {!chosen.length && <span className="placeholder">Touchez les blocs dans l’ordre</span>}
      </div>
      <div className="pool">
        {remaining.map((k) => (
          <button key={k} className="tok" disabled={locked} onClick={() => setChosen([...chosen, k])}>{ex.tokens[k]}</button>
        ))}
      </div>
      {tries === 1 && !locked && <p className="retry">Pas encore. Le premier bloc est en place : réessayez.</p>}
      {!locked && (
        <button
          className="btn primary block"
          disabled={!done}
          onClick={() => {
            const ok = chosen.every((v, k) => v === k);
            if (!ok && tries === 0) {
              setTries(1);
              setChosen([0]);
              return;
            }
            onAnswer(ok, tries > 0);
          }}
        >
          Vérifier
        </button>
      )}
    </>
  );
}

function TranslateEx({ ex, locked, onAnswer }: { ex: Extract<Exercise, { kind: 'translate' }>; locked: boolean; onAnswer: (v: Verdict, second: boolean) => void }) {
  const [val, setVal] = useState('');
  const [hint, setHint] = useState<string | null>(null);

  function submit(giveUp = false) {
    const v: Verdict = giveUp ? { level: 'wrong', expected: ex.accepted[0] } : evaluate(val, ex.accepted);
    if (v.level === 'wrong' && !hint && !giveUp) {
      // Premier essai manqué : un indice, et une seconde chance.
      const words = v.expected.replace(/^[¿¡]/, '').split(' ');
      setHint(`Indice : la phrase compte ${words.length} mots et commence par « ${v.expected.split(' ')[0]} ».`);
      return;
    }
    onAnswer(v, !!hint);
  }

  return (
    <>
      <div className="ex-type">Écrire</div>
      <h3>Écrivez en espagnol</h3>
      <p className="fr-prompt">« {ex.fr} »</p>
      <input
        className="answer"
        value={val}
        disabled={locked}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Votre réponse…"
        autoCapitalize="sentences"
        autoCorrect="off"
        spellCheck={false}
        lang="es"
        onKeyDown={(e) => { if (e.key === 'Enter' && val.trim()) submit(); }}
      />
      <div className="accent-keys">
        {['á', 'é', 'í', 'ó', 'ú', 'ñ', '¿', '¡'].map((k) => (
          <button key={k} className="key" disabled={locked} onClick={() => setVal(val + k)}>{k}</button>
        ))}
      </div>
      {hint && !locked && <p className="retry">Pas encore. {hint}</p>}
      {!locked && (
        <div className="row">
          <button className="btn ghost" onClick={() => submit(true)}>Voir la réponse</button>
          <button className="btn primary grow" disabled={!val.trim()} onClick={() => submit()}>{hint ? 'Réessayer' : 'Vérifier'}</button>
        </div>
      )}
      <p className="hint small">Majuscules et ponctuation ne comptent pas. Une petite faute de frappe ou un accent oublié est accepté.</p>
    </>
  );
}

function ShadowEx({ ex, onDone }: { ex: Extract<Exercise, { kind: 'shadow' }>; onDone: () => void }) {
  const c = chunkById[ex.chunk];
  const [recorded, setRecorded] = useState(false);
  return (
    <>
      <div className="ex-type">Prononciation</div>
      <h3>Écoutez, répétez, comparez</h3>
      <div className="shadow-text"><Gendered text={c.es} /></div>
      <div className="fr center">{c.fr}</div>
      <ol className="shadow-steps">
        <li>Écoutez le modèle (lentement, puis normalement).</li>
        <li>Enregistrez-vous en l’imitant : rythme, intonation.</li>
        <li>Réécoutez-vous, puis le modèle : qu’est-ce qui diffère ?</li>
      </ol>
      <div className="big-audio">
        <SpeakButton text={c.es} big />
        <SpeakButton text={c.es} slow big />
      </div>
      <Recorder onDone={() => setRecorded(true)} />
      <button className={`btn block ${recorded ? 'primary' : 'ghost'}`} onClick={onDone}>
        {recorded ? 'Suivant' : 'J’ai répété à voix haute'}
      </button>
    </>
  );
}

/* ───────── 5. Jeu de rôle ───────── */
function RoleplayStepView({ steps, partner, record, onNext }: { steps: RoleplayStep[]; partner: string; record: (ok: boolean, cat: ErrorCat, item: string) => void; onNext: () => void }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [firstTry, setFirstTry] = useState(true);
  const [history, setHistory] = useState<{ who: 'them' | 'me'; text: string }[]>([]);
  const s = steps[i];
  const options = useMemo(() => s.options, [s]);
  const solved = picked !== null && options[picked].ok;
  useEffect(() => {
    if (!s.waiter) return;
    const t = setTimeout(() => speak(s.waiter!), 400);
    return () => clearTimeout(t);
  }, [s]);

  function choose(k: number) {
    setPicked(k);
    const o = options[k];
    if (firstTry) record(o.ok, 'Interaction', o.es);
    if (o.ok) speak(o.es, { voice: 1 });
    else setFirstTry(false);
  }
  function go() {
    const add: { who: 'them' | 'me'; text: string }[] = [];
    if (s.waiter) add.push({ who: 'them', text: s.waiter });
    add.push({ who: 'me', text: options[picked!].es });
    setHistory([...history, ...add]);
    setPicked(null);
    setFirstTry(true);
    if (i + 1 >= steps.length) onNext();
    else setI(i + 1);
  }

  return (
    <section>
      <div className="card">
        <h2>À vous de jouer</h2>
        <p className="hint">Avant de choisir, <b>dites votre réponse à voix haute</b>. Ensuite seulement, touchez la bonne option.</p>
      </div>
      <div className="dialogue">
        {history.map((h, k) => (
          <div key={k} className={`bubble small ${h.who}`}><div className="es">{h.text}</div></div>
        ))}
        {s.waiter && (
          <div className="bubble them active" onClick={() => speak(s.waiter!)}>
            <div className="who">{partner}</div>
            <div className="es">{s.waiter}</div>
            {s.waiterFr && <div className="fr">{s.waiterFr}</div>}
          </div>
        )}
      </div>
      <div className="card">
        <div className="prompt">{s.prompt}</div>
        <div className="options">
          {options.map((o, k) => (
            <button key={k} disabled={solved} className={`opt left ${picked === k ? (o.ok ? 'right' : 'wrong') : ''}`} onClick={() => choose(k)}>
              <Gendered text={o.es} />
            </button>
          ))}
        </div>
        {picked !== null && (
          <div className={`feedback inline ${options[picked].ok ? 'ok' : 'ko'}`}>
            <div className="fb-detail">{options[picked].why}</div>
            {!options[picked].ok && <div className="fb-detail">Essayez encore.</div>}
          </div>
        )}
        {solved && <button className="btn primary block" onClick={go}>Continuer</button>}
      </div>
    </section>
  );
}

/* ───────── 6. Bilan ───────── */
function Bilan({ mission, result, onFinish }: { mission: M; result: Result; onFinish: () => void }) {
  const score = result.total ? Math.round((result.ok / result.total) * 100) : 100;
  const cats = Object.entries(result.byCat) as [ErrorCat, number][];
  const missed = mission.chunks.filter((c) => result.missedChunks.has(c.id));
  return (
    <section>
      <div className="card hero center">
        <div className="big-score">{score} %</div>
        <h2>{score >= 85 ? '¡Misión cumplida!' : score >= 60 ? '¡Bien hecho!' : 'Mission validée'}</h2>
        <p>{mission.outcome}</p>
        <p className="hint">{score >= 60 ? 'Prochain test grandeur nature : votre prochain café à Madrid.' : 'Pas de score minimum : la mission suivante est débloquée. Les phrases difficiles reviendront plus souvent en révision.'}</p>
      </div>
      <div className="card">
        <h3>À retravailler</h3>
        {cats.length === 0 ? (
          <p>Aucune erreur. Ces phrases reviendront quand même, de plus en plus espacées, pour ne pas être oubliées.</p>
        ) : (
          <ul className="cat-list">
            {cats.map(([c, n]) => <li key={c}><span>{c}</span><b>{n} erreur{n > 1 ? 's' : ''}</b></li>)}
          </ul>
        )}
        {missed.length > 0 && (
          <>
            <p className="hint">Ces phrases reviendront dès demain en révision :</p>
            <ul className="mini-chunks">{missed.map((c) => <li key={c.id}>{c.es}</li>)}</ul>
          </>
        )}
      </div>
      <div className="card">
        <h3>Et maintenant ?</h3>
        <p>Les <b>{mission.chunks.length} phrases</b> entrent dans vos révisions espacées : d’abord dans 1 à 3 jours, puis de plus en plus espacées. Les missions suivantes les réutiliseront.</p>
      </div>
      <button className="btn primary block" onClick={onFinish}>Valider la mission</button>
    </section>
  );
}
