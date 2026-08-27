import { useApp } from '../hooks/useApp';
import { formatMs } from '../lib/format';
import { daysBetween, todayKey } from '../lib/rng';
import { liveStreak } from '../lib/stats';
import Icon from './Icon';
import StreakChip from './StreakChip';

export type Screen = 'home' | 'minesweeper' | 'sudoku' | 'word' | 'group';

function bestLine(best: Record<string, number>, order: string[]): string {
  const parts = order.filter((k) => best[k] !== undefined).map((k) => `${k} ${formatMs(best[k])}`);
  return parts.length ? `Best · ${parts.join(' · ')}` : 'No best time yet';
}

function Home({ onOpen }: { onOpen: (s: Screen) => void }) {
  const { stats, todayResult, sharedStatus, config } = useApp();
  const today = todayKey();
  const wordStreak = liveStreak(stats.word, today, daysBetween);

  return (
    <main className="home">
      <p className="lede">
        Three classics, no accounts, no ads. Your progress and streaks are files in your own space.
      </p>

      <div className="cards">
        <button type="button" className="card" onClick={() => onOpen('minesweeper')}>
          <span className="card-ic"><Icon name="mine" size={22} /></span>
          <h2>Minesweeper</h2>
          <p>Beginner to expert, custom boards, safe first click, flag mode for touch.</p>
          <div className="card-foot">
            <StreakChip value={stats.minesweeper.streak} label="win streak" />
            <span className="muted mono">{bestLine(stats.minesweeper.best, ['beginner', 'intermediate', 'expert'])}</span>
          </div>
        </button>

        <button type="button" className="card" onClick={() => onOpen('sudoku')}>
          <span className="card-ic"><Icon name="grid" size={22} /></span>
          <h2>Sudoku</h2>
          <p>Unique-solution puzzles at three levels, pencil marks, hints and undo.</p>
          <div className="card-foot">
            <StreakChip value={stats.sudoku.streak} label="win streak" />
            <span className="muted mono">{bestLine(stats.sudoku.best, ['easy', 'medium', 'hard'])}</span>
          </div>
        </button>

        <button type="button" className="card" onClick={() => onOpen('word')}>
          <span className="card-ic"><Icon name="type" size={22} /></span>
          <h2>Daily word</h2>
          <p>One five-letter word a day, six guesses, the same word for everyone. Practice mode too.</p>
          <div className="card-foot">
            <StreakChip value={wordStreak} label="day streak" />
            <span className="muted mono">
              {todayResult ? (todayResult.won ? `Today · ${todayResult.guessCount}/6` : 'Today · missed') : 'Today · not played'}
            </span>
          </div>
        </button>
      </div>

      <button type="button" className="card card-row" onClick={() => onOpen('group')}>
        <span className="card-ic"><Icon name="users" size={22} /></span>
        <div>
          <h2>Group board</h2>
          <p>
            {sharedStatus === 'open'
              ? `Connected to ${config.spaceName || 'your shared space'} — see how your group did today.`
              : 'Share a space with friends and compare daily results and best times.'}
          </p>
        </div>
        <span className="arrow" aria-hidden="true">→</span>
      </button>
    </main>
  );
}

export default Home;
