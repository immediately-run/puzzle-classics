interface Props {
  counts: number[];
  notesMode: boolean;
  disabled?: boolean;
  onDigit: (d: number) => void;
}

/** Thumb-sized digit pad. Digits fully placed (9 of 9) are dimmed. */
function Numpad({ counts, notesMode, disabled, onDigit }: Props) {
  return (
    <div className={`numpad ${notesMode ? 'notes-mode' : ''}`} role="group" aria-label="Digits">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
        <button type="button" key={d} className={`num ${counts[d] >= 9 ? 'done' : ''}`} disabled={disabled} onClick={() => onDigit(d)}>
          <span className="d">{d}</span>
          <span className="left">{Math.max(0, 9 - counts[d])}</span>
        </button>
      ))}
    </div>
  );
}

export default Numpad;
