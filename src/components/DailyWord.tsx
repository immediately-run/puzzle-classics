import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../hooks/useApp';
import { useGameFile } from '../hooks/useGameFile';
import { p } from '../lib/appContext';
import { daysBetween, todayKey } from '../lib/rng';
import { liveStreak } from '../lib/stats';
import { MAX_GUESSES, WORD_LEN, gridRows, isAllowed, keyStates, newWordGame, score, shareText, submitGuess, type WordGame } from '../lib/wordle';
import Icon from './Icon';
import WordKeyboard from './WordKeyboard';

type Mode = 'daily' | 'practice';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function DailyWord() {
  const { priv, stats, recordDailyWord } = useApp();
  const [mode, setMode] = useState<Mode>('daily');
  const path = p.state(priv.root, mode === 'daily' ? 'word' : 'word-practice');
  const today = todayKey();
  // Roll a stale daily over to today's word (or start a practice game) as the file loads.
  const normalize = useCallback(
    (saved: WordGame | null): WordGame | null => {
      if (mode === 'daily') return saved && saved.mode === 'daily' && saved.date === today ? saved : newWordGame('daily', today);
      return saved && saved.mode === 'practice' ? saved : newWordGame('practice', today);
    },
    [mode, today],
  );
  const { value: game, set: setGame, loaded } = useGameFile<WordGame>(path, normalize);
  const [input, setInput] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const switchMode = (m: Mode) => {
    setMode(m);
    setInput('');
    setCopied('idle');
  };
  const newPractice = () => {
    setGame(newWordGame('practice', today));
    setInput('');
    setCopied('idle');
  };

  const say = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1600);
  };

  const onKey = useCallback(
    (k: string) => {
      if (!game || game.status !== 'playing') return;
      if (k === 'Enter') {
        if (input.length < WORD_LEN) {
          say('Not enough letters');
          setShake(true);
          setTimeout(() => setShake(false), 400);
          return;
        }
        if (!isAllowed(input)) {
          say('Not in word list');
          setShake(true);
          setTimeout(() => setShake(false), 400);
          return;
        }
        let next = submitGuess(game, input);
        if (next.mode === 'daily' && next.status !== 'playing' && !next.recorded) {
          // Record a finished daily exactly once (stats, daily file, shared board).
          recordDailyWord({ date: next.date, won: next.status === 'won', guessCount: next.guesses.length, grid: gridRows(next), at: Date.now() });
          next = { ...next, recorded: true };
        }
        setGame(next);
        setInput('');
        if (next.status === 'won') say(['Genius', 'Magnificent', 'Impressive', 'Splendid', 'Great', 'Phew'][next.guesses.length - 1]);
        else if (next.status === 'lost') say(next.answer.toUpperCase());
      } else if (k === 'Backspace') setInput((s) => s.slice(0, -1));
      else if (/^[a-z]$/.test(k) && input.length < WORD_LEN) setInput((s) => s + k);
    },
    [game, input, setGame, recordDailyWord],
  );

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (e.key === 'Enter' || e.key === 'Backspace') {
        onKey(e.key);
        e.preventDefault();
      } else if (/^[a-zA-Z]$/.test(e.key)) onKey(e.key.toLowerCase());
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onKey]);

  const share = async () => {
    if (!game) return;
    const ok = await copyText(shareText(game));
    setCopied(ok ? 'ok' : 'fail');
  };

  if (!loaded || !game) return <main className="screen"><p className="muted">Loading today's word…</p></main>;

  const states = keyStates(game);
  const over = game.status !== 'playing';
  const wordStreak = liveStreak(stats.word, today, daysBetween);
  const rows = Array.from({ length: MAX_GUESSES }, (_, r) => {
    if (r < game.guesses.length) return { letters: game.guesses[r].split(''), states: score(game.guesses[r], game.answer), current: false };
    if (r === game.guesses.length && !over) return { letters: input.padEnd(WORD_LEN).split(''), states: null, current: true };
    return { letters: Array<string>(WORD_LEN).fill(' '), states: null, current: false };
  });
  const maxDist = Math.max(1, ...stats.word.distribution);

  return (
    <main className="screen word">
      <div className="toolbar">
        <div className="seg" role="tablist" aria-label="Mode">
          <button type="button" role="tab" aria-selected={mode === 'daily'} className={`seg-btn ${mode === 'daily' ? 'on' : ''}`} onClick={() => switchMode('daily')}>
            Daily · {today}
          </button>
          <button type="button" role="tab" aria-selected={mode === 'practice'} className={`seg-btn ${mode === 'practice' ? 'on' : ''}`} onClick={() => switchMode('practice')}>
            Practice
          </button>
        </div>
        {mode === 'practice' && (
          <button type="button" className="btn btn-ghost" onClick={newPractice}>
            <Icon name="refresh" size={16} /> New word
          </button>
        )}
      </div>

      <div className="toast-anchor">{toast && <div className="toast" role="status">{toast}</div>}</div>

      <div className="board" role="grid" aria-label="Guesses">
        {rows.map((row, r) => (
          <div className={`brow ${row.current && shake ? 'shake' : ''}`} key={r} role="row">
            {row.letters.map((ch, c) => (
              <div key={c} className={`tile ${row.states ? row.states[c] : ch.trim() ? 'filled' : ''}`} role="gridcell" aria-label={row.states ? `${ch.toUpperCase()} ${row.states[c]}` : undefined}>
                {ch.trim().toUpperCase()}
              </div>
            ))}
          </div>
        ))}
      </div>

      {over ? (
        <div className="result">
          <h3>{game.status === 'won' ? `Got it in ${game.guesses.length}.` : `The word was ${game.answer.toUpperCase()}.`}</h3>
          <pre className="share-grid mono">{gridRows(game).join('\n')}</pre>
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={share}>
              <Icon name={copied === 'ok' ? 'check' : 'copy'} size={16} /> {copied === 'ok' ? 'Copied' : 'Copy result'}
            </button>
            {mode === 'practice' ? (
              <button type="button" className="btn btn-ghost" onClick={newPractice}>
                <Icon name="refresh" size={16} /> Another word
              </button>
            ) : (
              <span className="muted">Next word at midnight. Try practice mode meanwhile.</span>
            )}
          </div>
          {copied === 'fail' && <textarea className="share-fallback mono" readOnly value={shareText(game)} onFocus={(e) => e.currentTarget.select()} />}
        </div>
      ) : (
        <WordKeyboard states={states} onKey={onKey} />
      )}

      {mode === 'daily' && (
        <section className="stats">
          <h3>Daily stats</h3>
          <dl>
            <div><dt>Played</dt><dd>{stats.word.played}</dd></div>
            <div><dt>Win rate</dt><dd>{stats.word.played ? Math.round((100 * stats.word.won) / stats.word.played) : 0}%</dd></div>
            <div><dt>Streak</dt><dd>{wordStreak}</dd></div>
            <div><dt>Best streak</dt><dd>{stats.word.bestStreak}</dd></div>
          </dl>
          <div className="dist">
            {stats.word.distribution.map((n, i) => (
              <div className="dist-row" key={i}>
                <span className="mono">{i + 1}</span>
                <span className={`bar ${game.status === 'won' && game.guesses.length === i + 1 ? 'me' : ''}`} style={{ width: `${Math.max(8, (100 * n) / maxDist)}%` }}>{n}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

export default DailyWord;
