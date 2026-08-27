import type { ReactNode } from 'react';
import Icon from './Icon';
import ThemeSwitch from './ThemeSwitch';

function TopBar({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <header className="topbar">
      {onBack ? (
        <button type="button" className="iconbtn" onClick={onBack} aria-label="Back to home">
          <Icon name="back" size={20} />
        </button>
      ) : (
        <span className="mark" aria-hidden="true" />
      )}
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-right">
        {right}
        <ThemeSwitch />
      </div>
    </header>
  );
}

export default TopBar;
