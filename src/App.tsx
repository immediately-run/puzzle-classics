// Root component — immediately.run renders the default export of THIS file.
// Global CSS is imported here (not in main.tsx) because immediately.run's
// runtime never loads main.tsx; anything the rendered tree needs must be
// reachable from App.tsx.
import './index.css';
import './App.css';
import { useState } from 'react';
import { AppContext } from './lib/appContext';
import { useAppBoot } from './hooks/useAppBoot';
import TopBar from './components/TopBar';
import Home, { type Screen } from './components/Home';
import Minesweeper from './components/Minesweeper';
import Sudoku from './components/Sudoku';
import DailyWord from './components/DailyWord';
import Group from './components/Group';

const TITLES: Record<Screen, string> = {
  home: 'Puzzle classics',
  minesweeper: 'Minesweeper',
  sudoku: 'Sudoku',
  word: 'Daily word',
  group: 'Group board',
};

function App() {
  const { app, error } = useAppBoot();
  const [screen, setScreen] = useState<Screen>('home');

  if (error) {
    return (
      <div className="app">
        <TopBar title="Puzzle classics" />
        <main className="screen"><p className="error">Could not start: {error}</p></main>
      </div>
    );
  }
  if (!app) {
    return (
      <div className="app">
        <TopBar title="Puzzle classics" />
        <main className="screen"><p className="muted">Opening your files…</p></main>
      </div>
    );
  }

  return (
    <AppContext.Provider value={app}>
      <div className="app">
        <TopBar title={TITLES[screen]} onBack={screen === 'home' ? undefined : () => setScreen('home')} />
        {screen === 'home' && <Home onOpen={setScreen} />}
        {screen === 'minesweeper' && <Minesweeper />}
        {screen === 'sudoku' && <Sudoku />}
        {screen === 'word' && <DailyWord />}
        {screen === 'group' && <Group />}
        <footer className="foot mono">
          Progress lives in your private space; the group board only ever writes your own files.
        </footer>
      </div>
    </AppContext.Provider>
  );
}

export default App;
