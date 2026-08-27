import { createContext } from 'react';
import type { Store } from './store';
import type { AppConfig, DailyResult, TimedStats, WordStats } from './stats';

export type SharedStatus =
  | 'none' // never connected
  | 'opening' // re-mounting the remembered space
  | 'open'
  | 'needs-grant'; // remembered id exists but the mount failed → ask to pick again

export interface AppState {
  /** Private, per-user store (always present once booted). */
  priv: Store;
  login: string;
  config: AppConfig;
  setConfig: (patch: Partial<AppConfig>) => void;
  shared: Store | null;
  sharedStatus: SharedStatus;
  /** Error text from the last share attempt (cancelled is silent). */
  sharedError: string | null;
  connectShared: (how: 'pick' | 'create', name?: string) => Promise<void>;
  forgetShared: () => void;
  stats: { minesweeper: TimedStats; sudoku: TimedStats; word: WordStats };
  recordMinesweeper: (difficulty: string, won: boolean, ms: number) => void;
  recordSudoku: (difficulty: string, won: boolean, ms: number) => void;
  recordDailyWord: (r: DailyResult) => void;
  /** Whether today's daily result is already on file. */
  todayResult: DailyResult | null;
}

export const AppContext = createContext<AppState | null>(null);

// ── file layout under the private store ─────────────────────────────────────
export const p = {
  config: (root: string) => `${root}/config.json`,
  state: (root: string, game: string) => `${root}/state/${game}.json`,
  stats: (root: string, game: string) => `${root}/stats/${game}.json`,
  daily: (root: string, date: string) => `${root}/daily/${date}.json`,
  // shared space layout — one file per member, never a shared blob
  sharedDailyDir: (root: string, date: string) => `${root}/daily/${date}`,
  sharedDaily: (root: string, date: string, login: string) => `${root}/daily/${date}/${login}.json`,
  sharedBestDir: (root: string) => `${root}/best`,
  sharedBest: (root: string, login: string) => `${root}/best/${login}.json`,
};
