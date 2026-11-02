import { useState } from 'react';
import { missions } from './data/missions';
import { Dashboard } from './screens/Dashboard';
import { MissionScreen } from './screens/Mission';
import { ReviewScreen } from './screens/Review';
import { VocabScreen } from './screens/Vocab';
import { IconBook, IconCycle, IconHome } from './components/icons';

type View = { name: 'home' } | { name: 'vocab' } | { name: 'review' } | { name: 'mission'; id: string };

export default function App() {
  const [view, setView] = useState<View>({ name: 'home' });
  const home = () => { setView({ name: 'home' }); window.scrollTo(0, 0); };

  if (view.name === 'mission') {
    const m = missions.find((x) => x.id === view.id)!;
    return <MissionScreen mission={m} onExit={home} />;
  }
  if (view.name === 'review') return <ReviewScreen onExit={home} />;

  return (
    <>
      {view.name === 'home' && <Dashboard openMission={(id) => setView({ name: 'mission', id })} openReview={() => setView({ name: 'review' })} />}
      {view.name === 'vocab' && <VocabScreen />}
      <nav className="tabbar">
        <button className={view.name === 'home' ? 'on' : ''} onClick={home}><IconHome />Accueil</button>
        <button onClick={() => setView({ name: 'review' })}><IconCycle />Réviser</button>
        <button className={view.name === 'vocab' ? 'on' : ''} onClick={() => setView({ name: 'vocab' })}><IconBook />Mes phrases</button>
      </nav>
    </>
  );
}
