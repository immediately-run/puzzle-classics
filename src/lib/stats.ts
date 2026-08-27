// Stats + streak records. One file per game under <private>/stats/<game>.json.

export interface TimedStats {
  played: number;
  won: number;
  /** Consecutive wins (reset on a loss / abandon). */
  streak: number;
  bestStreak: number;
  /** Best completion time in ms, keyed by difficulty. */
  best: Record<string, number>;
}

export const emptyTimed = (): TimedStats => ({ played: 0, won: 0, streak: 0, bestStreak: 0, best: {} });

/** Record a finished timed game. Returns the new stats and whether a best time was set. */
export function recordTimed(s: TimedStats, difficulty: string, won: boolean, ms: number): { stats: TimedStats; newBest: boolean } {
  const played = s.played + 1;
  if (!won) return { stats: { ...s, played, streak: 0 }, newBest: false };
  const streak = s.streak + 1;
  const prev = s.best[difficulty];
  const newBest = difficulty !== 'custom' && (prev === undefined || ms < prev);
  const best = newBest ? { ...s.best, [difficulty]: ms } : s.best;
  return { stats: { played, won: s.won + 1, streak, bestStreak: Math.max(s.bestStreak, streak), best }, newBest };
}

export interface WordStats {
  played: number;
  won: number;
  /** Consecutive daily puzzles won (a missed day breaks it). */
  streak: number;
  bestStreak: number;
  /** Guess-count histogram, index 0 = solved in 1. */
  distribution: number[];
  /** Date key of the last daily puzzle that counted. */
  lastDaily?: string;
}

export const emptyWord = (): WordStats => ({ played: 0, won: 0, streak: 0, bestStreak: 0, distribution: [0, 0, 0, 0, 0, 0] });

/** Daily result — also the shape written into <private>/daily/<date>.json. */
export interface DailyResult {
  date: string;
  won: boolean;
  guessCount: number;
  grid: string[];
  at: number;
}

export function recordDaily(s: WordStats, r: DailyResult, daysSinceLast: number | null): WordStats {
  const continues = daysSinceLast === 1;
  const streak = r.won ? (continues ? s.streak + 1 : 1) : 0;
  const distribution = s.distribution.slice();
  if (r.won) distribution[r.guessCount - 1] = (distribution[r.guessCount - 1] ?? 0) + 1;
  return {
    played: s.played + 1,
    won: s.won + (r.won ? 1 : 0),
    streak,
    bestStreak: Math.max(s.bestStreak, streak),
    distribution,
    lastDaily: r.date,
  };
}

/** A daily streak only "lives" if the last counted day is today or yesterday. */
export function liveStreak(s: WordStats, todayKey: string, daysBetween: (a: string, b: string) => number): number {
  if (!s.lastDaily) return 0;
  const gap = daysBetween(s.lastDaily, todayKey);
  return gap <= 1 ? s.streak : 0;
}

// ── shared board records (one file per member) ─────────────────────────────

export interface SharedDaily {
  login: string;
  date: string;
  won: boolean;
  guessCount: number;
  grid: string[];
  at: number;
}

export interface SharedBest {
  login: string;
  minesweeper: Record<string, number>;
  sudoku: Record<string, number>;
  at: number;
}

export interface AppConfig {
  spaceId?: string;
  spaceName?: string;
  /** Sudoku: highlight wrong digits as you type. */
  mistakeHighlight?: boolean;
}
