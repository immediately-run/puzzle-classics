import { useState } from 'react';
import { useApp } from '../hooks/useApp';
import { useSharedBoard } from '../hooks/useSharedBoard';
import { formatMs } from '../lib/format';
import { todayKey } from '../lib/rng';
import Icon from './Icon';
import NameSetting from './NameSetting';

const MINE_LEVELS = ['beginner', 'intermediate', 'expert'];
const SUDOKU_LEVELS = ['easy', 'medium', 'hard'];

function Group() {
  const { shared, sharedStatus, sharedError, connectShared, sharedVersion, forgetShared, config, login } = useApp();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const today = todayKey();
  const board = useSharedBoard(shared, today, sharedVersion, 4000);

  const go = async (how: 'pick' | 'create') => {
    setBusy(true);
    try {
      await connectShared(how, name);
    } finally {
      setBusy(false);
    }
  };

  if (sharedStatus === 'opening') {
    return <main className="screen"><p className="muted">Opening {config.spaceName || 'your shared space'}…</p></main>;
  }

  if (!shared) {
    return (
      <main className="screen">
        <section className="panel">
          <h2>Play with your group.</h2>
          <p>
            Open a shared space and everyone in it sees today's word results and each other's best minesweeper and sudoku times.
            Each player only ever writes their own files — nothing here is private, so pick a space you share on purpose.
          </p>
          <p className="muted">
            To invite people, share the space itself from the platform's Spaces UI — this app cannot invite anyone.
          </p>
          {sharedStatus === 'needs-grant' && (
            <p className="notice">
              You used <b>{config.spaceName || config.spaceId}</b> before, but this app is not granted it right now. Pick it again to reconnect, or forget it.
            </p>
          )}
          <div className="row">
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => go('pick')}>
              <Icon name="link" size={16} /> {sharedStatus === 'needs-grant' ? 'Reconnect a space' : 'Open a shared space'}
            </button>
            {sharedStatus === 'needs-grant' && (
              <button type="button" className="btn btn-ghost" onClick={forgetShared}>
                Forget it
              </button>
            )}
          </div>
          <form
            className="row create"
            onSubmit={(e) => {
              e.preventDefault();
              void go('create');
            }}
          >
            <input type="text" placeholder="New space name" value={name} onChange={(e) => setName(e.target.value)} aria-label="New space name" />
            <button type="submit" className="btn btn-ghost" disabled={busy}>
              Create a new space
            </button>
          </form>
          {sharedError && <p className="error">{sharedError}</p>}
          <NameSetting />
        </section>
      </main>
    );
  }

  const readOnly = shared.mode === 'ro';

  return (
    <main className="screen">
      <div className="toolbar">
        <div className="space-id">
          <Icon name="users" size={18} />
          <b>{shared.name || config.spaceName || 'Shared space'}</b>
          <span className={`chip ${readOnly ? '' : 'chip-hot'}`}>{readOnly ? 'read-only' : 'read + write'}</span>
        </div>
        <button type="button" className="btn btn-ghost" onClick={forgetShared}>
          Disconnect
        </button>
      </div>
      {readOnly && <p className="notice">This space was granted read-only, so your own results are not posted here.</p>}
      <p className="hint">You appear as <b>{login}</b>. Updates from other members show up within a few seconds.</p>
      <NameSetting />

      <section className="panel">
        <h3>Today's word · {today}</h3>
        {board.loading ? (
          <p className="muted">Loading…</p>
        ) : board.daily.length === 0 ? (
          <p className="muted">Nobody has played today's word yet.</p>
        ) : (
          <ol className="leader">
            {board.daily.map((d, i) => (
              <li key={d.login} className={d.login === login ? 'me' : ''}>
                <span className="rank mono">{i + 1}</span>
                <span className="who">{d.login || 'someone'}</span>
                <span className="mono">{d.won ? `${d.guessCount}/6` : 'X/6'}</span>
                <pre className="mini-grid mono">{d.grid.join('\n')}</pre>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="panel">
        <h3>Best times</h3>
        {board.best.length === 0 ? (
          <p className="muted">No best times posted yet. Win a minesweeper or sudoku game and yours will appear.</p>
        ) : (
          <div className="table-wrap">
            <table className="best">
              <thead>
                <tr>
                  <th rowSpan={2}>Player</th>
                  <th colSpan={3}>Minesweeper</th>
                  <th colSpan={3}>Sudoku</th>
                </tr>
                <tr>
                  {MINE_LEVELS.map((l) => <th key={l}>{l.slice(0, 3)}</th>)}
                  {SUDOKU_LEVELS.map((l) => <th key={l}>{l.slice(0, 4)}</th>)}
                </tr>
              </thead>
              <tbody>
                {board.best.map((b) => (
                  <tr key={b.login} className={b.login === login ? 'me' : ''}>
                    <td>{b.login || 'someone'}</td>
                    {MINE_LEVELS.map((l) => <td key={l} className="mono">{b.minesweeper?.[l] !== undefined ? formatMs(b.minesweeper[l]) : '—'}</td>)}
                    {SUDOKU_LEVELS.map((l) => <td key={l} className="mono">{b.sudoku?.[l] !== undefined ? formatMs(b.sudoku[l]) : '—'}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

export default Group;
