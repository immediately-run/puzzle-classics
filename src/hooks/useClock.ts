import { useEffect, useState } from 'react';

/**
 * Re-renders every `intervalMs` while `running`, returning the wall-clock time
 * of the last tick (0 before the first one — callers clamp with Math.max).
 */
export function useClock(running: boolean, intervalMs = 500): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [running, intervalMs]);
  return now;
}
