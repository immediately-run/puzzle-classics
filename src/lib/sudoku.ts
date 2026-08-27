// Sudoku generator + solver. Grids are flat arrays of 81 numbers (0 = empty),
// row-major. The solver is a bitmask backtracking search that counts solutions
// (capped at 2) so the digger can guarantee uniqueness.

export type SudokuDifficulty = 'easy' | 'medium' | 'hard';

/** Target number of givens per difficulty (fewer givens = harder). */
export const SUDOKU_GIVENS: Record<SudokuDifficulty, number> = { easy: 40, medium: 32, hard: 26 };

const ALL = 0x1ff; // bits 0..8 → digits 1..9

const rowOf = (i: number) => Math.floor(i / 9);
const colOf = (i: number) => i % 9;
const boxOf = (i: number) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

interface Masks {
  rows: number[];
  cols: number[];
  boxes: number[];
}

function masksFor(grid: number[]): Masks {
  const m: Masks = { rows: Array(9).fill(0), cols: Array(9).fill(0), boxes: Array(9).fill(0) };
  for (let i = 0; i < 81; i++) {
    const v = grid[i];
    if (!v) continue;
    const bit = 1 << (v - 1);
    m.rows[rowOf(i)] |= bit;
    m.cols[colOf(i)] |= bit;
    m.boxes[boxOf(i)] |= bit;
  }
  return m;
}

const candidates = (m: Masks, i: number): number => ALL & ~(m.rows[rowOf(i)] | m.cols[colOf(i)] | m.boxes[boxOf(i)]);
const popcount = (x: number): number => {
  let c = 0;
  while (x) {
    x &= x - 1;
    c++;
  }
  return c;
};

/** Count solutions up to `limit` (2 is enough to test uniqueness). Mutates a copy. */
export function countSolutions(grid: number[], limit = 2): number {
  const g = grid.slice();
  const m = masksFor(g);
  let count = 0;
  const step = (): boolean => {
    // Most-constrained empty cell first.
    let best = -1;
    let bestMask = 0;
    let bestN = 10;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const c = candidates(m, i);
      const n = popcount(c);
      if (n === 0) return false;
      if (n < bestN) {
        best = i;
        bestMask = c;
        bestN = n;
        if (n === 1) break;
      }
    }
    if (best < 0) {
      count++;
      return count >= limit;
    }
    const r = rowOf(best);
    const c = colOf(best);
    const b = boxOf(best);
    for (let v = 1; v <= 9; v++) {
      const bit = 1 << (v - 1);
      if (!(bestMask & bit)) continue;
      g[best] = v;
      m.rows[r] |= bit;
      m.cols[c] |= bit;
      m.boxes[b] |= bit;
      const done = step();
      g[best] = 0;
      m.rows[r] &= ~bit;
      m.cols[c] &= ~bit;
      m.boxes[b] &= ~bit;
      if (done) return true;
    }
    return false;
  };
  step();
  return count;
}

/** Solve in place (first solution). Returns false when unsolvable. */
export function solve(grid: number[]): boolean {
  const m = masksFor(grid);
  const step = (): boolean => {
    let best = -1;
    let bestMask = 0;
    let bestN = 10;
    for (let i = 0; i < 81; i++) {
      if (grid[i]) continue;
      const c = candidates(m, i);
      const n = popcount(c);
      if (n === 0) return false;
      if (n < bestN) {
        best = i;
        bestMask = c;
        bestN = n;
        if (n === 1) break;
      }
    }
    if (best < 0) return true;
    const r = rowOf(best);
    const c = colOf(best);
    const b = boxOf(best);
    for (let v = 1; v <= 9; v++) {
      const bit = 1 << (v - 1);
      if (!(bestMask & bit)) continue;
      grid[best] = v;
      m.rows[r] |= bit;
      m.cols[c] |= bit;
      m.boxes[b] |= bit;
      if (step()) return true;
      grid[best] = 0;
      m.rows[r] &= ~bit;
      m.cols[c] &= ~bit;
      m.boxes[b] &= ~bit;
    }
    return false;
  };
  return step();
}

function shuffled<T>(arr: T[], rnd: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Fill a full valid grid with randomised backtracking. */
export function fullGrid(rnd: () => number = Math.random): number[] {
  const g = Array<number>(81).fill(0);
  const m = masksFor(g);
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const step = (i: number): boolean => {
    if (i === 81) return true;
    const r = rowOf(i);
    const c = colOf(i);
    const b = boxOf(i);
    for (const v of shuffled(digits, rnd)) {
      const bit = 1 << (v - 1);
      if (m.rows[r] & bit || m.cols[c] & bit || m.boxes[b] & bit) continue;
      g[i] = v;
      m.rows[r] |= bit;
      m.cols[c] |= bit;
      m.boxes[b] |= bit;
      if (step(i + 1)) return true;
      g[i] = 0;
      m.rows[r] &= ~bit;
      m.cols[c] &= ~bit;
      m.boxes[b] &= ~bit;
    }
    return false;
  };
  step(0);
  return g;
}

export interface Generated {
  puzzle: number[];
  solution: number[];
}

/**
 * Generate a puzzle with a unique solution: fill a grid, then "dig" cells in a
 * random order, keeping each removal only if the puzzle stays uniquely solvable,
 * until the target number of givens is reached (or no more cells can be removed).
 */
export function generate(difficulty: SudokuDifficulty, rnd: () => number = Math.random): Generated {
  const solution = fullGrid(rnd);
  const puzzle = solution.slice();
  const target = SUDOKU_GIVENS[difficulty];
  let givens = 81;
  // Dig symmetric pairs first for a nicer look, then singles if still above target.
  const order = shuffled(Array.from({ length: 81 }, (_, i) => i), rnd);
  for (const i of order) {
    if (givens <= target) break;
    if (!puzzle[i]) continue;
    const j = 80 - i;
    const saved = puzzle[i];
    const savedJ = puzzle[j];
    puzzle[i] = 0;
    let removed = 1;
    if (j !== i && puzzle[j] && givens - 2 >= target) {
      puzzle[j] = 0;
      removed = 2;
    }
    if (countSolutions(puzzle, 2) === 1) {
      givens -= removed;
    } else {
      // Try just the single cell before giving up on it.
      puzzle[j] = savedJ;
      if (removed === 2 && countSolutions(puzzle, 2) === 1) givens -= 1;
      else puzzle[i] = saved;
    }
  }
  return { puzzle, solution };
}

// ── game state ────────────────────────────────────────────────────────────────

export interface SudokuMove {
  i: number;
  prevValue: number;
  prevNotes: number;
  value: number;
  notes: number;
}

export type SudokuStatus = 'playing' | 'won';

export interface SudokuGame {
  difficulty: SudokuDifficulty;
  puzzle: number[];
  solution: number[];
  values: number[];
  /** Pencil marks as 9-bit masks per cell. */
  notes: number[];
  history: SudokuMove[];
  status: SudokuStatus;
  hints: number;
  mistakes: number;
  elapsed: number;
  /** Wall-clock ms when the current running segment began (null when not running). */
  runStart: number | null;
}

export function newSudoku(difficulty: SudokuDifficulty): SudokuGame {
  const { puzzle, solution } = generate(difficulty);
  return {
    difficulty,
    puzzle,
    solution,
    values: puzzle.slice(),
    notes: Array<number>(81).fill(0),
    history: [],
    status: 'playing',
    hints: 0,
    mistakes: 0,
    elapsed: 0,
    runStart: Date.now(),
  };
}

export const isGiven = (g: SudokuGame, i: number): boolean => g.puzzle[i] !== 0;
export const isSolved = (g: SudokuGame): boolean => g.values.every((v, i) => v === g.solution[i]);

function apply(g: SudokuGame, i: number, value: number, notes: number, countMistake = false): SudokuGame {
  if (g.status === 'won' || isGiven(g, i)) return g;
  if (g.values[i] === value && g.notes[i] === notes) return g;
  const move: SudokuMove = { i, prevValue: g.values[i], prevNotes: g.notes[i], value, notes };
  const values = g.values.slice();
  const nts = g.notes.slice();
  values[i] = value;
  nts[i] = notes;
  // Placing a digit erases that digit from pencil marks in the same row/col/box.
  if (value) {
    const bit = 1 << (value - 1);
    for (let j = 0; j < 81; j++) {
      if (j === i) continue;
      if (rowOf(j) === rowOf(i) || colOf(j) === colOf(i) || boxOf(j) === boxOf(i)) nts[j] &= ~bit;
    }
  }
  const mistakes = countMistake && value && value !== g.solution[i] ? g.mistakes + 1 : g.mistakes;
  const next: SudokuGame = { ...g, values, notes: nts, history: [...g.history, move], mistakes };
  if (isSolved(next)) next.status = 'won';
  return next;
}

export const setValue = (g: SudokuGame, i: number, v: number): SudokuGame =>
  apply(g, i, g.values[i] === v ? 0 : v, 0, true);

export const clearCell = (g: SudokuGame, i: number): SudokuGame => apply(g, i, 0, 0);

export function toggleNote(g: SudokuGame, i: number, v: number): SudokuGame {
  if (g.values[i]) return g;
  return apply(g, i, 0, g.notes[i] ^ (1 << (v - 1)));
}

export function undo(g: SudokuGame): SudokuGame {
  if (g.status === 'won' || g.history.length === 0) return g;
  const last = g.history[g.history.length - 1];
  const values = g.values.slice();
  const notes = g.notes.slice();
  values[last.i] = last.prevValue;
  notes[last.i] = last.prevNotes;
  return { ...g, values, notes, history: g.history.slice(0, -1) };
}

/** Reveal one cell: the selected one if empty/wrong, else the first wrong/empty cell. */
export function hint(g: SudokuGame, preferred: number | null): SudokuGame {
  if (g.status === 'won') return g;
  let i = preferred;
  if (i === null || isGiven(g, i) || g.values[i] === g.solution[i]) {
    i = g.values.findIndex((v, k) => !isGiven(g, k) && v !== g.solution[k]);
  }
  if (i < 0) return g;
  const next = apply(g, i, g.solution[i], 0);
  return next === g ? g : { ...next, hints: g.hints + 1 };
}

/** Cells whose value conflicts with another in the same unit (rule-based, not solution-based). */
export function conflicts(g: SudokuGame): boolean[] {
  const bad = Array<boolean>(81).fill(false);
  for (let i = 0; i < 81; i++) {
    const v = g.values[i];
    if (!v) continue;
    for (let j = i + 1; j < 81; j++) {
      if (g.values[j] !== v) continue;
      if (rowOf(j) === rowOf(i) || colOf(j) === colOf(i) || boxOf(j) === boxOf(i)) {
        bad[i] = true;
        bad[j] = true;
      }
    }
  }
  return bad;
}

/** How many of each digit are still to be placed (for greying out the numpad). */
export function digitCounts(g: SudokuGame): number[] {
  const c = Array<number>(10).fill(0);
  for (const v of g.values) if (v) c[v]++;
  return c;
}

export { rowOf, colOf, boxOf };
