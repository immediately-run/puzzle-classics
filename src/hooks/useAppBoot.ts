import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@immediately-run/sdk/auth';
import {
  createSharedStore,
  openPrivateStore,
  openRememberedSpace,
  pickSharedStore,
  readJson,
  writeJson,
  type Store,
} from '../lib/store';
import { p, type AppState, type SharedStatus } from '../lib/appContext';
import {
  emptyTimed,
  emptyWord,
  recordDaily,
  recordTimed,
  type AppConfig,
  type DailyResult,
  type SharedBest,
  type SharedDaily,
  type TimedStats,
  type WordStats,
} from '../lib/stats';
import { daysBetween, todayKey } from '../lib/rng';
import { safeName } from '../lib/format';

interface Booted {
  priv: Store;
  config: AppConfig;
  stats: AppState['stats'];
  todayResult: DailyResult | null;
}

const errText = (e: unknown): string => {
  const code = (e as { code?: string } | null)?.code;
  if (code === 'cancelled') return '';
  if (code === 'auth-required') return 'Sign in to share a space.';
  if (code === 'forbidden') return 'This app is not allowed to open spaces here.';
  return (e as Error)?.message || 'Could not open the space.';
};

/**
 * Boots persistence: opens the private store FIRST, loads config + stats, then
 * re-mounts a remembered shared space without prompting. Returns null until the
 * private store is open. StrictMode double-runs the effect, so nothing is written
 * before the `cancelled` check.
 */
export function useAppBoot(): { app: AppState | null; error: string | null } {
  const auth = useAuth();
  const login = auth.status === 'signed-in' && auth.user?.login ? auth.user.login : 'someone';
  const [booted, setBooted] = useState<Booted | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shared, setShared] = useState<Store | null>(null);
  const [sharedStatus, setSharedStatus] = useState<SharedStatus>('none');
  const [sharedError, setSharedError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let priv: Store;
      try {
        priv = await openPrivateStore('data');
      } catch (e) {
        // No settings mount (e.g. a host without storage): keep playing in memory.
        console.warn('puzzle-classics: private store unavailable', e);
        priv = { root: '/tmp/puzzle-classics', mode: 'rw', kind: 'memory' };
      }
      const today = todayKey();
      const [config, minesweeper, sudoku, word, todayResult] = await Promise.all([
        readJson<AppConfig>(p.config(priv.root), {}),
        readJson<TimedStats>(p.stats(priv.root, 'minesweeper'), emptyTimed()),
        readJson<TimedStats>(p.stats(priv.root, 'sudoku'), emptyTimed()),
        readJson<WordStats>(p.stats(priv.root, 'word'), emptyWord()),
        readJson<DailyResult | null>(p.daily(priv.root, today), null),
      ]);
      if (cancelled) return;
      setBooted({ priv, config, stats: { minesweeper, sudoku, word }, todayResult });
      if (config.spaceId) {
        setSharedStatus('opening');
        const s = await openRememberedSpace(config.spaceId, 'puzzle-classics');
        if (cancelled) return;
        if (s) {
          setShared(s);
          setSharedStatus('open');
        } else {
          setSharedStatus('needs-grant');
        }
      }
    })().catch((e) => {
      if (!cancelled) setError((e as Error)?.message || String(e));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Latest values for callbacks that must not go stale (synced in an effect —
  // never assigned during render).
  const latest = useRef<{ booted: Booted | null; shared: Store | null; login: string }>({ booted: null, shared: null, login: 'someone' });
  useEffect(() => {
    latest.current = { booted, shared, login };
  }, [booted, shared, login]);

  // ── config ────────────────────────────────────────────────────────────────
  const setConfig = useCallback((patch: Partial<AppConfig>) => {
    const b = latest.current.booted;
    if (!b) return;
    const config = { ...b.config, ...patch };
    const next = { ...b, config };
    latest.current.booted = next;
    setBooted(next);
    void writeJson(p.config(b.priv.root), config).catch(() => {});
  }, []);

  // ── shared sync (one file per member) ─────────────────────────────────────

  const syncShared = useCallback(async (override?: { shared?: Store | null; booted?: Booted | null }) => {
    const s = override?.shared ?? latest.current.shared;
    const b = override?.booted ?? latest.current.booted;
    const me = latest.current.login;
    if (!s || !b || s.mode !== 'rw') return;
    const name = safeName(me);
    try {
      const { minesweeper, sudoku } = b.stats;
      if (Object.keys(minesweeper.best).length || Object.keys(sudoku.best).length) {
        const rec: SharedBest = { login: me, minesweeper: minesweeper.best, sudoku: sudoku.best, at: Date.now() };
        await writeJson(p.sharedBest(s.root, name), rec);
      }
      if (b.todayResult) {
        const r = b.todayResult;
        const rec: SharedDaily = { login: me, date: r.date, won: r.won, guessCount: r.guessCount, grid: r.grid, at: r.at };
        await writeJson(p.sharedDaily(s.root, r.date, name), rec);
      }
    } catch (e) {
      console.warn('puzzle-classics: shared sync failed', e);
    }
  }, []);

  // Push my records whenever the shared store (re)opens.
  useEffect(() => {
    if (shared && booted) void syncShared({ shared, booted });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shared]);

  const connectShared = useCallback(
    async (how: 'pick' | 'create', name?: string) => {
      setSharedError(null);
      try {
        const s = how === 'create' ? await createSharedStore(name?.trim() || 'Puzzle group', 'puzzle-classics') : await pickSharedStore('puzzle-classics');
        setShared(s);
        setSharedStatus('open');
        setConfig({ spaceId: s.spaceId, spaceName: s.name });
      } catch (e) {
        const t = errText(e);
        if (t) setSharedError(t);
      }
    },
    [setConfig],
  );

  const forgetShared = useCallback(() => {
    setShared(null);
    setSharedStatus('none');
    setConfig({ spaceId: undefined, spaceName: undefined });
  }, [setConfig]);

  // ── stats ─────────────────────────────────────────────────────────────────
  const recordTimedGame = useCallback(
    (game: 'minesweeper' | 'sudoku', difficulty: string, won: boolean, ms: number) => {
      const b = latest.current.booted;
      if (!b) return;
      const { stats, newBest } = recordTimed(b.stats[game], difficulty, won, ms);
      const next = { ...b, stats: { ...b.stats, [game]: stats } };
      latest.current.booted = next;
      setBooted(next);
      void writeJson(p.stats(b.priv.root, game), stats).catch(() => {});
      if (newBest) void syncShared({ booted: next });
    },
    [syncShared],
  );
  const recordMinesweeper = useCallback((d: string, w: boolean, ms: number) => recordTimedGame('minesweeper', d, w, ms), [recordTimedGame]);
  const recordSudoku = useCallback((d: string, w: boolean, ms: number) => recordTimedGame('sudoku', d, w, ms), [recordTimedGame]);

  const recordDailyWord = useCallback(
    (r: DailyResult) => {
      const b = latest.current.booted;
      if (!b) return;
      const last = b.stats.word.lastDaily;
      if (last === r.date) return; // already counted
      const word = recordDaily(b.stats.word, r, last ? daysBetween(last, r.date) : null);
      const next = { ...b, stats: { ...b.stats, word }, todayResult: r.date === todayKey() ? r : b.todayResult };
      latest.current.booted = next;
      setBooted(next);
      void writeJson(p.stats(b.priv.root, 'word'), word).catch(() => {});
      void writeJson(p.daily(b.priv.root, r.date), r).catch(() => {});
      void syncShared({ booted: next });
    },
    [syncShared],
  );

  const app = useMemo<AppState | null>(() => {
    if (!booted) return null;
    return {
      priv: booted.priv,
      login,
      config: booted.config,
      setConfig,
      shared,
      sharedStatus,
      sharedError,
      connectShared,
      forgetShared,
      stats: booted.stats,
      recordMinesweeper,
      recordSudoku,
      recordDailyWord,
      todayResult: booted.todayResult,
    };
  }, [booted, login, setConfig, shared, sharedStatus, sharedError, connectShared, forgetShared, recordMinesweeper, recordSudoku, recordDailyWord]);

  return { app, error };
}
