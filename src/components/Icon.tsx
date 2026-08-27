// Lucide-style inline SVG icons (currentColor, 24-unit grid). No emoji anywhere.
type IconName =
  | 'back'
  | 'flag'
  | 'mine'
  | 'clock'
  | 'undo'
  | 'bulb'
  | 'pencil'
  | 'eraser'
  | 'users'
  | 'copy'
  | 'check'
  | 'x'
  | 'trophy'
  | 'refresh'
  | 'grid'
  | 'type'
  | 'shovel'
  | 'delete'
  | 'flame'
  | 'link';

const PATHS: Record<IconName, string> = {
  back: 'M19 12H5M12 19l-7-7 7-7',
  flag: 'M4 22V4M4 4h12l-2 4 2 4H4',
  mine: 'M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.2 2.2M16.9 16.9l2.2 2.2M4.9 19.1l2.2-2.2M16.9 7.1l2.2-2.2M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  undo: 'M3 7v6h6M3 13a9 9 0 1 0 3-7.7L3 8',
  bulb: 'M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.7.6 1 1.3 1 2.3v1h6v-1c0-1 .3-1.7 1-2.3A7 7 0 0 0 12 2z',
  pencil: 'M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z',
  eraser: 'M20 20H7L3 16a2 2 0 0 1 0-3l9.6-9.6a2 2 0 0 1 2.8 0l5.2 5.2a2 2 0 0 1 0 2.8L13 19M6 11l7 7',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  copy: 'M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2zM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
  check: 'M20 6L9 17l-5-5',
  x: 'M18 6L6 18M6 6l12 12',
  trophy: 'M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.7V17c0 .5-.5 1-1 1.2-1.5.5-2 1.6-2 3.8h10c0-2.2-.5-3.3-2-3.8-.5-.2-1-.7-1-1.2v-2.3M18 2H6v7a6 6 0 0 0 12 0V2z',
  refresh: 'M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6',
  grid: 'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18',
  type: 'M4 7V4h16v3M9 20h6M12 4v16',
  shovel: 'M2 22l7-7M14 3l7 7-4.5 4.5a2 2 0 0 1-2.8 0L9.5 10.3a2 2 0 0 1 0-2.8L14 3zM9.5 10.3L6 13.8',
  delete: 'M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM18 9l-6 6M12 9l6 6',
  flame: 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.2-.2-4.1 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.5-2.5 1-3.5.5 1.5 1.5 2.5 2.5 3z',
  link: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7',
};

function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

export default Icon;
