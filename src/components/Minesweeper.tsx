import { useEffect, useRef, useState } from 'react';
import { useApp } from '../hooks/useApp';
import { useGameFile } from '../hooks/useGameFile';
import { useClock } from '../hooks/useClock';
import { p } from '../lib/appContext';
import { formatMs } from '../lib/format';
import {
  MINE_PRESETS,
  chord,
  clampSpec,
  minesLeft,
  newGame,
  reveal,
  toggleFlag,
  type MineDifficulty,
  type MineGame,
  type MineSpec,
} from '../lib/minesweeper';
import { writeJson } from '../lib/store';
import { fold, resumeOnLoad, shownElapsed } from '../lib/timing';
import Icon from './Icon';
import MineBoard from './MineBoard';

const DIFFS: MineDifficulty[] = ['beginner', 'intermediate', 'expert', 'custom'];
const LEVELS = ['beginner', 'intermediate', 'expert'] as const;

function Minesweeper() {
  const { priv, stats, recordMinesweeper } = useApp();
  const path = p.state(priv.root, 'minesweeper');
  const { value: game, set: setGame, loaded } = useGameFile<MineGame>(path, resumeOnLoad);
  const [flagMode, setFlagMode] = useState(false);
  const [custom, setCustom] = useState<MineSpec>({ rows: 12, cols: 12, mines: 25 });
  const [showCustom, setShowCustom] = useState(false);

  const running = game?.status === 'playing';
  const now = useClock(running, 500);
  const gameRef = useRef<MineGame | null>(null);
  useEffect(() => {
    gameRef.current = game ?? null;
  }, [game]);

  // Fold running time into the saved file every 10 s, and on unmount, so a
  // reload resumes with an honest clock.
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

  const start = (difficulty: MineDifficulty, spec?: MineSpec) => {
    const s = difficulty === 'custom' ? clampSpec(spec ?? custom) : MINE_PRESETS[difficulty];
    setGame(newGame(difficulty, s));
    setShowCustom(false);
  };

  const act = (fn: (g: MineGame) => MineGame) => {
    if (!game) return;
    let next = fn(game);
    if (next === game) return;
    if (game.status !== 'playing' && next.status === 'playing') next = { ...next, runStart: Date.now() };
    const ended = next.status === 'won' || next.status === 'lost';
    if (ended) next = { ...fold({ ...next, status: 'playing' }), status: next.status, runStart: null };
    setGame(next);
    if (ended && (game.status === 'idle' || game.status === 'playing')) {
      recordMinesweeper(next.difficulty, next.status === 'won', next.elapsed);
    }
  };

  if (!loaded) return <main className="screen"><p className="muted">Loading your board…</p></main>;

  const diff = game?.difficulty ?? 'beginner';
  const best = game && game.difficulty !== 'custom' ? stats.minesweeper.best[game.difficulty] : undefined;

  return (
    <main className="screen">
      <div className="toolbar">
        <div className="seg" role="group" aria-label="Difficulty">
          {DIFFS.map((d) => (
            <button
              type="button"
              key={d}
              className={`seg-btn ${diff === d ? 'on' : ''}`}
              onClick={() => (d === 'custom' ? setShowCustom((v) => !v) : start(d))}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {showCustom && (
        <form
          className="custom-form"
          onSubmit={(e) => {
            e.preventDefault();
            start('custom', custom);
          }}
        >
          <label>
            Rows
            <input type="number" min={5} max={40} value={custom.rows} onChange={(e) => setCustom({ ...custom, rows: Number(e.target.value) })} />
          </label>
          <label>
            Columns
            <input type="number" min={5} max={60} value={custom.cols} onChange={(e) => setCustom({ ...custom, cols: Number(e.target.value) })} />
          </label>
          <label>
            Mines
            <input type="number" min={1} value={custom.mines} onChange={(e) => setCustom({ ...custom, mines: Number(e.target.value) })} />
          </label>
          <button type="submit" className="btn btn-primary">Start custom</button>
        </form>
      )}

      {game ? (
        <>
          <div className="hud">
            <span className="hud-stat mono" title="Mines left">
              <Icon name="mine" size={16} /> {minesLeft(game)}
            </span>
            <button
              type="button"
              className={`btn ${game.status === 'lost' ? 'btn-danger' : game.status === 'won' ? 'btn-win' : 'btn-ghost'}`}
              onClick={() => start(game.difficulty, game)}
            >
              <Icon name="refresh" size={16} />
              {game.status === 'lost' ? 'Boom — again' : game.status === 'won' ? 'Cleared — again' : 'New game'}
            </button>
            <span className="hud-stat mono" title="Time">
              <Icon name="clock" size={16} /> {formatMs(shownElapsed(game, now))}
            </span>
          </div>

          <MineBoard
            game={game}
            flagMode={flagMode}
            onReveal={(i) => act((g) => reveal(g, i))}
            onFlag={(i) => act((g) => toggleFlag(g, i))}
            onChord={(i) => act((g) => chord(g, i))}
          />

          <div className="modebar" role="group" aria-label="Tap mode">
            <button type="button" className={`mode-btn ${!flagMode ? 'on' : ''}`} onClick={() => setFlagMode(false)} aria-pressed={!flagMode}>
              <Icon name="shovel" size={20} /> Dig
            </button>
            <button type="button" className={`mode-btn ${flagMode ? 'on' : ''}`} onClick={() => setFlagMode(true)} aria-pressed={flagMode}>
              <Icon name="flag" size={20} /> Flag
            </button>
          </div>
          <p className="hint">Long-press (or right-click) to flag. Tap a number whose flags match to open its neighbours.</p>

          {game.status === 'won' && (
            <div className="result">
              <h3>Cleared in {formatMs(game.elapsed)}.</h3>
              <p className="muted">
                {best !== undefined && game.elapsed <= best ? 'New best time for this level.' : best !== undefined ? `Best: ${formatMs(best)}.` : ''} Win streak:{' '}
                {stats.minesweeper.streak}.
              </p>
            </div>
          )}
          {game.status === 'lost' && (
            <div className="result">
              <h3>That one was a mine.</h3>
              <p className="muted">Streak reset. {best !== undefined ? `Best on this level: ${formatMs(best)}.` : ''}</p>
            </div>
          )}
        </>
      ) : (
        <div className="empty">
          <p>Pick a difficulty to start. The first tap is always safe.</p>
          <div className="row">
            {LEVELS.map((d) => (
              <button type="button" key={d} className="btn btn-primary" onClick={() => start(d)}>
                {d} · {MINE_PRESETS[d].cols}×{MINE_PRESETS[d].rows}
              </button>
            ))}
          </div>
        </div>
      )}

      <section className="stats">
        <h3>Your stats</h3>
        <dl>
          <div><dt>Played</dt><dd>{stats.minesweeper.played}</dd></div>
          <div><dt>Won</dt><dd>{stats.minesweeper.won}</dd></div>
          <div><dt>Streak</dt><dd>{stats.minesweeper.streak}</dd></div>
          <div><dt>Best streak</dt><dd>{stats.minesweeper.bestStreak}</dd></div>
          {LEVELS.map((d) => (
            <div key={d}><dt>Best {d}</dt><dd>{stats.minesweeper.best[d] !== undefined ? formatMs(stats.minesweeper.best[d]) : '—'}</dd></div>
          ))}
        </dl>
      </section>
    </main>
  );
}

export default Minesweeper;
