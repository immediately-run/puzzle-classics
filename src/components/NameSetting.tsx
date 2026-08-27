import { useState } from 'react';
import { useApp } from '../hooks/useApp';

/** "Your name" for the group board — only the fallback when the host gives the app
 *  no login (stage apps run with elevated identity, so that is the common case). */
function NameSetting() {
  const { config, setConfig } = useApp();
  const [draft, setDraft] = useState(config.displayName ?? '');
  const saved = (config.displayName ?? '').trim();
  return (
    <form
      className="row name-setting"
      onSubmit={(e) => {
        e.preventDefault();
        setConfig({ displayName: draft.trim() || undefined });
      }}
    >
      <label htmlFor="display-name" className="hint">Your name on the board</label>
      <input id="display-name" type="text" maxLength={32} placeholder="e.g. peter" value={draft} onChange={(e) => setDraft(e.target.value)} />
      <button type="submit" className="btn btn-ghost" disabled={draft.trim() === saved}>
        Save name
      </button>
    </form>
  );
}

export default NameSetting;
