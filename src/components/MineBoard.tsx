import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { MineGame } from '../lib/minesweeper';
import Icon from './Icon';

const LONG_PRESS_MS = 420;

interface Props {
  game: MineGame;
  flagMode: boolean;
  onReveal: (i: number) => void;
  onFlag: (i: number) => void;
  onChord: (i: number) => void;
}

/**
 * The grid. Cells are at least 32px (thumb-sized); wider boards scroll inside this
 * container rather than the page. Long-press flags, right-click flags, tapping a
 * revealed number chords.
 */
function MineBoard({ game, flagMode, onReveal, onFlag, onChord }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const [cell, setCell] = useState(36);
  const press = useRef<{ timer: ReturnType<typeof setTimeout> | null; fired: boolean; i: number }>({ timer: null, fired: false, i: -1 });

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const fit = () => {
      const w = el.clientWidth - 2;
      setCell(Math.max(32, Math.min(42, Math.floor(w / game.cols))));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [game.cols]);

  const over = game.status === 'won' || game.status === 'lost';

  const clearPress = () => {
    const p = press.current;
    if (p.timer) clearTimeout(p.timer);
    p.timer = null;
  };

  const onPointerDown = (i: number) => (e: ReactPointerEvent) => {
    if (over) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const c = game.cells[i];
    if (c.r) return;
    clearPress();
    press.current = {
      i,
      fired: false,
      timer: setTimeout(() => {
        press.current.fired = true;
        press.current.timer = null;
        onFlag(i);
      }, LONG_PRESS_MS),
    };
  };

  const onClick = (i: number) => () => {
    if (over) return;
    const p = press.current;
    if (p.fired && p.i === i) {
      p.fired = false; // this click belongs to the long-press that already flagged
      return;
    }
    clearPress();
    const c = game.cells[i];
    if (c.r) onChord(i);
    else if (flagMode) onFlag(i);
    else onReveal(i);
  };

  const onContext = (i: number) => (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (over) return;
    const c = game.cells[i];
    if (c.r) onChord(i);
    else onFlag(i);
  };

  return (
    <div className="mine-wrap" ref={wrap}>
      <div
        className={`mine-grid ${over ? 'is-over' : ''}`}
        style={{ gridTemplateColumns: `repeat(${game.cols}, ${cell}px)`, ['--cell' as string]: `${cell}px` }}
        role="grid"
        aria-label="Minefield"
      >
        {game.cells.map((c, i) => {
          const boom = game.boom === i;
          const wrong = game.status === 'lost' && c.f && !c.m;
          const cls = ['cell'];
          if (c.r) cls.push('open');
          if (c.r && c.m) cls.push('mine');
          if (boom) cls.push('boom');
          if (c.f) cls.push('flag');
          if (wrong) cls.push('wrong');
          if (c.r && !c.m && c.n) cls.push(`n${c.n}`);
          return (
            <button
              type="button"
              key={i}
              className={cls.join(' ')}
              onPointerDown={onPointerDown(i)}
              onPointerUp={clearPress}
              onPointerLeave={clearPress}
              onPointerCancel={clearPress}
              onClick={onClick(i)}
              onContextMenu={onContext(i)}
              aria-label={c.r ? (c.m ? 'mine' : c.n ? `${c.n}` : 'empty') : c.f ? 'flagged' : 'hidden'}
            >
              {c.r && c.m ? <Icon name="mine" size={Math.round(cell * 0.55)} /> : null}
              {!c.r && c.f && !wrong ? <Icon name="flag" size={Math.round(cell * 0.5)} /> : null}
              {wrong ? <Icon name="x" size={Math.round(cell * 0.5)} /> : null}
              {c.r && !c.m && c.n ? c.n : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default MineBoard;
