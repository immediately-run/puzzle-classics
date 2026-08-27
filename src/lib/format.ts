/** Seconds → "m:ss" (or "h:mm:ss" past an hour). */
export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`;
}

/** Milliseconds → "m:ss". */
export const formatMs = (ms: number): string => formatTime(ms / 1000);

/** Safe filename fragment for a login handle. */
export function safeName(login: string): string {
  const s = login.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return s || 'someone';
}
