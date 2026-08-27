import { boxOf, colOf, rowOf, type SudokuGame } from '../lib/sudoku';

interface Props {
  game: SudokuGame;
  selected: number | null;
  onSelect: (i: number) => void;
  showMistakes: boolean;
  conflicts: boolean[];
}

function SudokuGrid({ game, selected, onSelect, showMistakes, conflicts }: Props) {
  const selVal = selected !== null ? game.values[selected] : 0;
  const sr = selected !== null ? rowOf(selected) : -1;
  const sc = selected !== null ? colOf(selected) : -1;
  const sb = selected !== null ? boxOf(selected) : -1;

  return (
    <div className={`sudoku ${game.status === 'won' ? 'is-won' : ''}`} role="grid" aria-label="Sudoku grid">
      {game.values.map((v, i) => {
        const given = game.puzzle[i] !== 0;
        const cls = ['sq'];
        if (given) cls.push('given');
        if (i === selected) cls.push('sel');
        else if (rowOf(i) === sr || colOf(i) === sc || boxOf(i) === sb) cls.push('peer');
        if (v && v === selVal && i !== selected) cls.push('same');
        if (v && !given && showMistakes && v !== game.solution[i]) cls.push('bad');
        if (v && conflicts[i]) cls.push('conflict');
        if (colOf(i) % 3 === 2 && colOf(i) !== 8) cls.push('br');
        if (rowOf(i) % 3 === 2 && rowOf(i) !== 8) cls.push('bb');
        const notes = game.notes[i];
        return (
          <button type="button" key={i} className={cls.join(' ')} onClick={() => onSelect(i)} aria-label={`row ${rowOf(i) + 1} column ${colOf(i) + 1}${v ? ` ${v}` : notes ? ` notes ${[1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => notes & (1 << (d - 1))).join(' ')}` : ' empty'}`}>
            {v ? (
              v
            ) : notes ? (
              <span className="notes">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                  <i key={d} className={notes & (1 << (d - 1)) ? (d === selVal ? 'hl' : '') : 'off'}>{notes & (1 << (d - 1)) ? d : ''}</i>
                ))}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export default SudokuGrid;
