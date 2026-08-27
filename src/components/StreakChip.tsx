import Icon from './Icon';

/** Small pill showing a streak count; renders a muted "no streak" state at 0. */
function StreakChip({ value, label = 'streak' }: { value: number; label?: string }) {
  return (
    <span className={`chip ${value > 0 ? 'chip-hot' : ''}`}>
      <Icon name="flame" size={14} />
      {value > 0 ? `${value} ${label}` : `no ${label}`}
    </span>
  );
}

export default StreakChip;
