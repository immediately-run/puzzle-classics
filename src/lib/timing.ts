// Shared stopwatch bookkeeping for the timed games. A game carries `elapsed`
// (ms accumulated before the current segment) and `runStart` (wall-clock ms the
// segment began, or null). Nothing here reads React state, so it can run inside
// event handlers, intervals and the file-load callback alike.

export interface Timed {
  status: string;
  elapsed: number;
  runStart: number | null;
}

/** What the clock should display given the last tick `now` (0 before any tick). */
export function shownElapsed<T extends Timed>(g: T, now: number): number {
  return g.elapsed + (g.status === 'playing' && g.runStart ? Math.max(0, now - g.runStart) : 0);
}

/** Total elapsed right now. */
export function totalElapsed<T extends Timed>(g: T): number {
  return g.elapsed + (g.status === 'playing' && g.runStart ? Math.max(0, Date.now() - g.runStart) : 0);
}

/** Fold the running segment into `elapsed` and start a new one (or stop when not playing). */
export function fold<T extends Timed>(g: T): T {
  const elapsed = totalElapsed(g);
  return { ...g, elapsed, runStart: g.status === 'playing' ? Date.now() : null };
}

/** On load: a game saved mid-play resumes from its saved elapsed time (time away doesn't count). */
export function resumeOnLoad<T extends Timed>(g: T | null): T | null {
  if (!g) return g;
  if (g.status === 'playing') return { ...g, runStart: Date.now() };
  if (g.runStart !== null) return { ...g, runStart: null };
  return g;
}
