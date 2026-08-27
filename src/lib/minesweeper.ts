// Minesweeper rules. Pure functions over a serialisable board so the in-progress
// game can be written to a file as-is.

export type MineDifficulty = 'beginner' | 'intermediate' | 'expert' | 'custom';

export interface MineSpec {
  rows: number;
  cols: number;
  mines: number;
}

export const MINE_PRESETS: Record<Exclude<MineDifficulty, 'custom'>, MineSpec> = {
  beginner: { rows: 9, cols: 9, mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  expert: { rows: 16, cols: 30, mines: 99 },
};

export const MINE_LIMITS = { minSize: 5, maxRows: 40, maxCols: 60 };

/** Clamp a custom spec into something playable (mines leave a safe 3×3 for the first click). */
export function clampSpec(spec: MineSpec): MineSpec {
  const rows = Math.min(MINE_LIMITS.maxRows, Math.max(MINE_LIMITS.minSize, Math.floor(spec.rows) || 0));
  const cols = Math.min(MINE_LIMITS.maxCols, Math.max(MINE_LIMITS.minSize, Math.floor(spec.cols) || 0));
  const mines = Math.min(rows * cols - 9, Math.max(1, Math.floor(spec.mines) || 0));
  return { rows, cols, mines };
}

export interface Cell {
  /** mine */
  m: 0 | 1;
  /** revealed */
  r: 0 | 1;
  /** flagged */
  f: 0 | 1;
  /** adjacent mine count */
  n: number;
}

export type MineStatus = 'idle' | 'playing' | 'won' | 'lost';

export interface MineGame {
  difficulty: MineDifficulty;
  rows: number;
  cols: number;
  mines: number;
  cells: Cell[];
  status: MineStatus;
  /** Set once the first click placed the mines. */
  placed: boolean;
  /** Accumulated play time in ms (folded in whenever the game is saved). */
  elapsed: number;
  /** Wall-clock ms when the current running segment began (null when not running). */
  runStart: number | null;
  /** Index of the mine that ended the game, if lost. */
  boom?: number;
}

export function newGame(difficulty: MineDifficulty, spec: MineSpec): MineGame {
  const s = clampSpec(spec);
  const cells: Cell[] = [];
  for (let i = 0; i < s.rows * s.cols; i++) cells.push({ m: 0, r: 0, f: 0, n: 0 });
  return { difficulty, ...s, cells, status: 'idle', placed: false, elapsed: 0, runStart: null };
}

export function neighbors(g: { rows: number; cols: number }, i: number): number[] {
  const r = Math.floor(i / g.cols);
  const c = i % g.cols;
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < g.rows && nc >= 0 && nc < g.cols) out.push(nr * g.cols + nc);
    }
  }
  return out;
}

const cloneCells = (cells: Cell[]): Cell[] => cells.map((c) => ({ ...c }));

/** Place mines avoiding the first-clicked cell and its neighbours — the first click is always safe and opens an area. */
function placeMines(g: MineGame, safe: number): MineGame {
  const forbidden = new Set([safe, ...neighbors(g, safe)]);
  const candidates: number[] = [];
  for (let i = 0; i < g.cells.length; i++) if (!forbidden.has(i)) candidates.push(i);
  // Partial Fisher–Yates: pick `mines` distinct indices.
  for (let i = 0; i < g.mines && i < candidates.length; i++) {
    const j = i + Math.floor(Math.random() * (candidates.length - i));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const cells = cloneCells(g.cells);
  for (let i = 0; i < g.mines && i < candidates.length; i++) cells[candidates[i]].m = 1;
  for (let i = 0; i < cells.length; i++) {
    if (cells[i].m) continue;
    cells[i].n = neighbors(g, i).reduce((acc, j) => acc + cells[j].m, 0);
  }
  return { ...g, cells, placed: true, status: 'playing' };
}

function floodReveal(g: MineGame, cells: Cell[], start: number): void {
  const stack = [start];
  while (stack.length) {
    const i = stack.pop()!;
    const c = cells[i];
    if (c.r || c.f) continue;
    c.r = 1;
    if (c.n === 0 && !c.m) for (const j of neighbors(g, i)) if (!cells[j].r && !cells[j].f) stack.push(j);
  }
}

function finish(g: MineGame, cells: Cell[]): MineGame {
  const lostAt = cells.findIndex((c) => c.m && c.r);
  if (lostAt >= 0) {
    // Show every mine; mark wrong flags by revealing them too (the UI renders the cross).
    for (const c of cells) if (c.m && !c.f) c.r = 1;
    return { ...g, cells, status: 'lost', boom: lostAt };
  }
  const remaining = cells.some((c) => !c.m && !c.r);
  if (!remaining) {
    for (const c of cells) if (c.m) c.f = 1;
    return { ...g, cells, status: 'won' };
  }
  return { ...g, cells };
}

/** Reveal a cell (left click / tap in dig mode). */
export function reveal(g: MineGame, i: number): MineGame {
  if (g.status === 'won' || g.status === 'lost') return g;
  let game = g;
  if (!game.placed) game = placeMines(game, i);
  const cell = game.cells[i];
  if (cell.r) return chord(game, i);
  if (cell.f) return game;
  const cells = cloneCells(game.cells);
  if (cells[i].m) {
    cells[i].r = 1;
    return finish(game, cells);
  }
  floodReveal(game, cells, i);
  return finish(game, cells);
}

/** Toggle a flag on an unrevealed cell. */
export function toggleFlag(g: MineGame, i: number): MineGame {
  if (g.status === 'won' || g.status === 'lost') return g;
  const cell = g.cells[i];
  if (cell.r) return g;
  const cells = cloneCells(g.cells);
  cells[i].f = cells[i].f ? 0 : 1;
  return { ...g, cells, status: g.placed ? 'playing' : g.status };
}

/** Chord: on a revealed number whose flag count matches, reveal all other neighbours. */
export function chord(g: MineGame, i: number): MineGame {
  if (g.status !== 'playing') return g;
  const cell = g.cells[i];
  if (!cell.r || cell.n === 0) return g;
  const ns = neighbors(g, i);
  const flags = ns.reduce((acc, j) => acc + g.cells[j].f, 0);
  if (flags !== cell.n) return g;
  const cells = cloneCells(g.cells);
  for (const j of ns) {
    if (cells[j].f || cells[j].r) continue;
    if (cells[j].m) cells[j].r = 1;
    else floodReveal(g, cells, j);
  }
  return finish(g, cells);
}

export const flagsPlaced = (g: MineGame): number => g.cells.reduce((a, c) => a + c.f, 0);
export const minesLeft = (g: MineGame): number => g.mines - flagsPlaced(g);
