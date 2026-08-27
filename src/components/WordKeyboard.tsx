import type { LetterState } from '../lib/wordle';
import Icon from './Icon';

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

interface Props {
  states: Record<string, LetterState>;
  disabled?: boolean;
  onKey: (k: string) => void; // letter | 'Enter' | 'Backspace'
}

function WordKeyboard({ states, disabled, onKey }: Props) {
  return (
    <div className="kb" role="group" aria-label="Keyboard">
      {ROWS.map((row, r) => (
        <div className="kb-row" key={row}>
          {r === 2 && (
            <button type="button" className="key wide" disabled={disabled} onClick={() => onKey('Enter')}>
              Enter
            </button>
          )}
          {row.split('').map((ch) => (
            <button type="button" key={ch} className={`key ${states[ch] ?? ''}`} disabled={disabled} onClick={() => onKey(ch)} aria-label={states[ch] ? `${ch} ${states[ch]}` : undefined}>
              {ch}
            </button>
          ))}
          {r === 2 && (
            <button type="button" className="key wide" disabled={disabled} onClick={() => onKey('Backspace')} aria-label="Backspace">
              <Icon name="delete" size={22} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default WordKeyboard;
