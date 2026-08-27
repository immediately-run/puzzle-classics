# Puzzle classics

Minesweeper, Sudoku and a daily five-letter word game — with streaks kept in
your own files and an optional shared results board for your group. An example
app for [immediately.run](https://immediately.run): React + TypeScript, no
server, no accounts, no dependencies beyond the platform SDK.

## Try it

Open it on immediately.run:

<https://immediately.run/present/github/immediately-run/puzzle-classics/main/files/src/App.tsx>

Works on a phone (375 px wide) as well as a desktop. Everything is tap-friendly;
keyboards are optional extras.

## What's inside

**Minesweeper** — beginner (9×9, 10), intermediate (16×16, 40), expert (30×16, 99)
and custom boards. The first tap is always safe and opens an area. Tap-mode
toggle (Dig / Flag) for touch, long-press or right-click to flag, tap a revealed
number whose flags match to chord-open its neighbours. Timer, best times per
level, win streak.

**Sudoku** — puzzles generated on the device with a guaranteed unique solution
(randomised fill + digger that checks uniqueness with a bitmask backtracking
solver) at easy / medium / hard. Pencil marks, mistake highlighting (toggle),
hint (reveals one cell), undo, timer, on-screen numpad with remaining counts,
and keyboard control (digits, backspace, arrows, `N` notes, `Z` undo, `H` hint).

**Daily word** — one five-letter word per calendar day, the same for everyone
(seeded from the date into a bundled answer list of ~1,250 words; ~4,000 words
are accepted as guesses). Six guesses, on-screen keyboard with letter states,
share-result grid copied to the clipboard, daily streak and guess distribution.
A practice mode hands out random words.

**Group board** — optional. Pick or create a shared space and every member's
daily word result and best minesweeper / sudoku times are merged into one board.

## How data is stored

Everything is plain JSON in the platform filesystem — no browser storage is
used (the app runs at an opaque origin where `localStorage` throws).

Private, per-user, per-app (the app's settings mount):

```
<private>/config.json                 remembered space id + preferences
<private>/state/minesweeper.json      in-progress board (resumes with its clock)
<private>/state/sudoku.json           in-progress puzzle, notes, undo history
<private>/state/word.json             today's daily game
<private>/state/word-practice.json    current practice game
<private>/stats/<game>.json           played / won / streaks / best times
<private>/daily/<YYYY-MM-DD>.json     the day's word result
```

Shared space (only when you connect one) — **one record = one file**, and each
member only ever writes their own files, so nothing can be clobbered:

```
<shared>/puzzle-classics/daily/<YYYY-MM-DD>/<login>.json   guess count, won, grid
<shared>/puzzle-classics/best/<login>.json                 best times per level
```

The Group screen merges those files and polls the two directories every 4 s
(shared spaces don't get remote change events). Your own records are pushed
when a game finishes and whenever the space (re)connects.

## Multi-user notes

- Connecting a space is asked for, never taken: "Open a shared space" goes
  through the host's picker, "Create a new space" through the host's consent
  dialog. Declining just leaves the board off.
- The app cannot invite anyone — share the space itself from the platform's
  Spaces UI.
- A read-only grant shows the board but doesn't post your results.
- The chosen space id is remembered in `<private>/config.json` and re-mounted
  at boot without a prompt. If the grant is gone (or the space was *created*
  rather than picked — creation currently records no durable grant), the Group
  screen offers "Reconnect a space".

## Local development

```bash
npm install
npm run dev      # vite dev — the fs bridge writes under ./devfs-playground/
npm run build    # tsc + vite build
npm run lint     # includes the React Fast Refresh rule immediately.run relies on
```

Under `vite dev` there is no host, so the "shared space" is simulated by a
second folder under `devfs-playground/` and the signed-in user is "someone".
