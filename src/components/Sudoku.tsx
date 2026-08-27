import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../hooks/useApp';
import { useGameFile } from '../hooks/useGameFile';
import { useClock } from '../hooks/useClock';
import { p } from '../lib/appContext';
import { formatMs } from '../lib/format';
import { clearCell, conflicts, digitCounts, hint, newSudoku, setValue, toggleNote, undo, type SudokuDifficulty, type SudokuGame } from '../lib/sudoku';
import { writeJson } from '../lib/store';
import { fold, resumeOnLoad, shownElapsed } from '../lib/timing';
import Icon from './Icon';
import Numpad from './Numpad';
import SudokuGrid from './SudokuGrid';

const DIFFS: SudokuDifficulty[] = ['easy', 'medium', 'hard'];

function Sudoku() {
  const { priv, stats, config, setConfig, recordSudoku } = useApp();
  const path = p.state(priv.root, 'sudoku');
  const { value: game, set: setGame, loaded } = useGameFile<SudokuGame>(path, resumeOnLoad);
  const [selected, setSelected] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [generating, setGenerating] = useState(false);
  const showMistakes = config.mistakeHighlight ?? true;

  const running = game?.status === 'playing';
  const now = useClock(running, 500);
  const gameRef = useRef<SudokuGame | null>(null);
  useEffect(() => {
    gameRef.current = game ?? null;
  }, [game]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setGame((g) => (g && g.status === 'playing' ? fold(g) : g)), 10000);
    return () => clearInterval(id);
  }, [running, setGame]);
  useEffect(
    () => () => {
      const g = gameRef.current;
      if (g && g.status === 'playing') void writeJson(path, fold(g)).catch(() => {});
    },
    [path],
  );

  const start = (d: SudokuDifficulty) => {
    setGenerating(true);
    // Let the button repaint before the (synchronous, ~100 ms) generation.
    setTimeout(() => {
      setGame(newSudoku(d));
      setSelected(null);
      setNotesMode(false);
      setGenerating(false);
    }, 20);
  };

  const act = (fn: (g: SudokuGame) => SudokuGame) => {
    if (!game) return;
    let next = fn(game);
    if (next === game) return;
    const won = game.status === 'playing' && next.status === 'won';
    if (won) next = { ...fold({ ...next, status: 'playing' }), status: 'won', runStart: null };
    setGame(next);
    if (won) recordSudoku(next.difficulty, true, next.elapsed);
  };

  const onDigit = (d: number) => {
    if (selected === null) return;
    act((g) => (notesMode ? toggleNote(g, selected, d) : setValue(g, selected, d)));
  };

  // Physical keyboard: digits, backspace, arrows, N (notes), Z (undo), H (hint).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!game || game.status !== 'playing') return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (e.key >= '1' && e.key <= '9') {
        onDigit(Number(e.key));
        e.preventDefault();
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        if (selected !== null) act((g) => clearCell(g, selected));
        e.preventDefault();
      } else if (e.key.startsWith('Arrow')) {
        const cur = selected ?? 0;
        const r = Math.floor(cur / 9);
        const c = cur % 9;
        const nr = e.key === 'ArrowUp' ? (r + 8) % 9 : e.key === 'ArrowDown' ? (r + 1) % 9 : r;
        const nc = e.key === 'ArrowLeft' ? (c + 8) % 9 : e.key === 'ArrowRight' ? (c + 1) % 9 : c;
        setSelected(nr * 9 + nc);
        e.preventDefault();
      } else if (e.key === 'n' || e.key === 'N') setNotesMode((v) => !v);
      else if ((e.key === 'z' || e.key === 'Z') && !e.shiftKey) act(undo);
      else if (e.key === 'h' || e.key === 'H') act((g) => hint(g, selected));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const bad = useMemo(() => (game ? conflicts(game) : []), [game]);
  const counts = useMemo(() => (game ? digitCounts(game) : []), [game]);

  if (!loaded) return <main className="screen"><p className="muted">Loading your puzzle…</p></main>;

  const best = game ? stats.sudoku.best[game.difficulty] : undefined;

  return (
    <main className="screen">
      <div className="toolbar">
        <div className="seg" role="group" aria-label="Difficulty">
          {DIFFS.map((d) => (
            <button type="button" key={d} className={`seg-btn ${game?.difficulty === d ? 'on' : ''}`} disabled={generating} onClick={() => start(d)}>
              {d}
            </button>
          ))}
        </div>
        <label className="toggle">
          <input type="checkbox" checked={showMistakes} onChange={(e) => setConfig({ mistakeHighlight: e.target.checked })} />
          Show mistakes
        </label>
      </div>

      {game ? (
        <>
          <div className="hud">
            <span className="hud-stat mono" title="Mistakes">
              <Icon name="x" size={16} /> {game.mistakes}
            </span>
            <button type="button" className={`btn ${game.status === 'won' ? 'btn-win' : 'btn-ghost'}`} disabled={generating} onClick={() => start(game.difficulty)}>
              <Icon name="refresh" size={16} /> {generating ? 'Generating…' : game.status === 'won' ? 'Solved — new puzzle' : 'New puzzle'}
            </button>
            <span className="hud-stat mono" title="Time">
              <Icon name="clock" size={16} /> {formatMs(shownElapsed(game, now))}
            </span>
          </div>

          <SudokuGrid game={game} selected={selected} onSelect={setSelected} showMistakes={showMistakes} conflicts={bad} />

          <div className="actions" role="group" aria-label="Actions">
            <button type="button" className="act" onClick={() => act(undo)} disabled={game.status !== 'playing' || game.history.length === 0}>
              <Icon name="undo" size={20} /> Undo
            </button>
            <button type="button" className="act" onClick={() => selected !== null && act((g) => clearCell(g, selected))} disabled={game.status !== 'playing'}>
              <Icon name="eraser" size={20} /> Erase
            </button>
            <button type="button" className={`act ${notesMode ? 'on' : ''}`} onClick={() => setNotesMode((v) => !v)} aria-pressed={notesMode} disabled={game.status !== 'playing'}>
              <Icon name="pencil" size={20} /> Notes
            </button>
            <button type="button" className="act" onClick={() => act((g) => hint(g, selected))} disabled={game.status !== 'playing'}>
              <Icon name="bulb" size={20} /> Hint
            </button>
          </div>

          <Numpad counts={counts} notesMode={notesMode} disabled={game.status !== 'playing'} onDigit={onDigit} />
          <p className="hint">Keyboard: digits, backspace, arrows, N for notes, Z to undo, H for a hint.</p>

          {game.status === 'won' && (
            <div className="result">
              <h3>Solved in {formatMs(game.elapsed)}.</h3>
              <p className="muted">
                {best !== undefined && game.elapsed <= best ? 'New best time for this level. ' : best !== undefined ? `Best: ${formatMs(best)}. ` : ''}
                {game.hints ? `${game.hints} hint${game.hints > 1 ? 's' : ''} used. ` : ''}
                Win streak: {stats.sudoku.streak}.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="empty">
          <p>Every puzzle has exactly one solution. Pick a level.</p>
          <div className="row">
            {DIFFS.map((d) => (
              <button type="button" key={d} className="btn btn-primary" disabled={generating} onClick={() => start(d)}>
                {generating ? 'Generating…' : d}
              </button>
            ))}
          </div>
        </div>
      )}

      <section className="stats">
        <h3>Your stats</h3>
        <dl>
          <div><dt>Played</dt><dd>{stats.sudoku.played}</dd></div>
          <div><dt>Solved</dt><dd>{stats.sudoku.won}</dd></div>
          <div><dt>Streak</dt><dd>{stats.sudoku.streak}</dd></div>
          <div><dt>Best streak</dt><dd>{stats.sudoku.bestStreak}</dd></div>
          {DIFFS.map((d) => (
            <div key={d}><dt>Best {d}</dt><dd>{stats.sudoku.best[d] !== undefined ? formatMs(stats.sudoku.best[d]) : '—'}</dd></div>
          ))}
        </dl>
      </section>
    </main>
  );
}

export default Sudoku;
