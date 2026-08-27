import { ANSWERS } from '../data/answers';
import { ALLOWED } from '../data/allowed';
import { hashString, seededRandom, todayKey } from './rng';

export const WORD_LEN = 5;
export const MAX_GUESSES = 6;

const allowedSet = new Set<string>(ALLOWED);
for (const w of ANSWERS) allowedSet.add(w);

export const isAllowed = (w: string): boolean => allowedSet.has(w.toLowerCase());

/** Deterministic answer for a calendar day — same word for everyone, every device. */
export function dailyAnswer(dateKey: string = todayKey()): string {
  const rnd = seededRandom(hashString(`puzzle-classics:daily:${dateKey}`));
  return ANSWERS[Math.floor(rnd() * ANSWERS.length)];
}

export const randomAnswer = (): string => ANSWERS[Math.floor(Math.random() * ANSWERS.length)];

export type LetterState = 'correct' | 'present' | 'absent';

/** Standard two-pass scoring so repeated letters are handled correctly. */
export function score(guess: string, answer: string): LetterState[] {
  const res: LetterState[] = Array(WORD_LEN).fill('absent');
  const left: Record<string, number> = {};
  for (let i = 0; i < WORD_LEN; i++) {
    if (guess[i] === answer[i]) res[i] = 'correct';
    else left[answer[i]] = (left[answer[i]] ?? 0) + 1;
  }
  for (let i = 0; i < WORD_LEN; i++) {
    if (res[i] === 'correct') continue;
    const ch = guess[i];
    if (left[ch]) {
      res[i] = 'present';
      left[ch]--;
    }
  }
  return res;
}

export type WordStatus = 'playing' | 'won' | 'lost';

export interface WordGame {
  mode: 'daily' | 'practice';
  /** Date key for daily games; the day the practice game started otherwise. */
  date: string;
  answer: string;
  guesses: string[];
  status: WordStatus;
  /** True once the finished result has been recorded into stats/daily files. */
  recorded?: boolean;
}

export function newWordGame(mode: 'daily' | 'practice', dateKey: string = todayKey()): WordGame {
  return {
    mode,
    date: dateKey,
    answer: mode === 'daily' ? dailyAnswer(dateKey) : randomAnswer(),
    guesses: [],
    status: 'playing',
  };
}

export function submitGuess(g: WordGame, guess: string): WordGame {
  if (g.status !== 'playing') return g;
  const w = guess.toLowerCase();
  if (w.length !== WORD_LEN || !isAllowed(w)) return g;
  const guesses = [...g.guesses, w];
  const status: WordStatus = w === g.answer ? 'won' : guesses.length >= MAX_GUESSES ? 'lost' : 'playing';
  return { ...g, guesses, status };
}

/** Best known state per keyboard letter across all guesses. */
export function keyStates(g: WordGame): Record<string, LetterState> {
  const rank: Record<LetterState, number> = { absent: 0, present: 1, correct: 2 };
  const out: Record<string, LetterState> = {};
  for (const guess of g.guesses) {
    const s = score(guess, g.answer);
    for (let i = 0; i < WORD_LEN; i++) {
      const ch = guess[i];
      if (!out[ch] || rank[s[i]] > rank[out[ch]]) out[ch] = s[i];
    }
  }
  return out;
}

const GLYPH: Record<LetterState, string> = { correct: '█', present: '▓', absent: '░' };

/** Text grid rows (no emoji: solid / medium / light shade blocks). */
export function gridRows(g: WordGame): string[] {
  return g.guesses.map((guess) => score(guess, g.answer).map((s) => GLYPH[s]).join(''));
}

/** Shareable summary, e.g. "Puzzle classics · daily 2026-08-27 · 4/6". */
export function shareText(g: WordGame): string {
  const n = g.status === 'won' ? String(g.guesses.length) : 'X';
  const head = g.mode === 'daily' ? `Puzzle classics · daily ${g.date} · ${n}/${MAX_GUESSES}` : `Puzzle classics · practice · ${n}/${MAX_GUESSES}`;
  return [head, ...gridRows(g)].join('\n');
}
