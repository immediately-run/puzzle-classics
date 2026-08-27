import { useEffect, useState } from 'react';
import { listFiles, pollDir, readJson, type Store } from '../lib/store';
import { p } from '../lib/appContext';
import type { SharedBest, SharedDaily } from '../lib/stats';

export interface Board {
  daily: SharedDaily[];
  best: SharedBest[];
  loading: boolean;
}

interface Snapshot {
  key: string;
  daily: SharedDaily[];
  best: SharedBest[];
}

async function readAll<T extends object>(dir: string): Promise<T[]> {
  const names = await listFiles(dir, '.json');
  const items: (T | null)[] = await Promise.all(names.map((n) => readJson<T | null>(`${dir}/${n}`, null)));
  return items.filter((x): x is T => x !== null && typeof x === 'object');
}

/** Merges every member's one-file-per-record entries; polls (shared spaces get no remote events). */
export function useSharedBoard(shared: Store | null, date: string, intervalMs = 4000): Board {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const key = shared ? `${shared.root}|${date}` : '';

  useEffect(() => {
    if (!shared) return;
    let cancelled = false;
    const dailyDir = p.sharedDailyDir(shared.root, date);
    const bestDir = p.sharedBestDir(shared.root);
    const load = async () => {
      const [daily, best] = await Promise.all([readAll<SharedDaily>(dailyDir), readAll<SharedBest>(bestDir)]);
      if (cancelled) return;
      daily.sort((a, b) => Number(b.won) - Number(a.won) || a.guessCount - b.guessCount || a.at - b.at);
      best.sort((a, b) => a.login.localeCompare(b.login));
      setSnap({ key, daily, best });
    };
    void load();
    const stops = [pollDir(dailyDir, () => void load(), intervalMs), pollDir(bestDir, () => void load(), intervalMs)];
    return () => {
      cancelled = true;
      for (const stop of stops) stop();
    };
  }, [shared, date, intervalMs, key]);

  if (!shared) return { daily: [], best: [], loading: false };
  if (!snap || snap.key !== key) return { daily: [], best: [], loading: true };
  return { daily: snap.daily, best: snap.best, loading: false };
}
