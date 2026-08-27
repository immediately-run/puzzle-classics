import { useCallback, useEffect, useRef, useState } from 'react';
import { readJson, removeFile, writeJson } from '../lib/store';

interface Loaded<T> {
  path: string;
  value: T | null;
}

/**
 * A JSON file as React state: loads once per path, writes (debounced) on every
 * change, flushes on unmount. `undefined` = still loading, `null` = no saved game.
 * `normalize` runs on the freshly loaded value (e.g. roll a stale daily over);
 * when it returns something else, that is written back immediately.
 */
export function useGameFile<T>(
  path: string,
  normalize?: (saved: T | null) => T | null,
): {
  value: T | null | undefined;
  set: (next: T | null | ((prev: T | null) => T | null)) => void;
  loaded: boolean;
} {
  const [state, setState] = useState<Loaded<T> | null>(null);
  const dirty = useRef<{ path: string; v: T | null } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const normRef = useRef(normalize);
  useEffect(() => {
    normRef.current = normalize;
  }, [normalize]);

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const d = dirty.current;
    if (!d) return;
    dirty.current = null;
    const op = d.v === null ? removeFile(d.path) : writeJson(d.path, d.v);
    void op.catch((e) => console.warn('puzzle-classics: save failed', e));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void readJson<T | null>(path, null).then((saved) => {
      if (cancelled) return;
      const v = normRef.current ? normRef.current(saved) : saved;
      setState({ path, value: v });
      if (v !== saved && v !== null) void writeJson(path, v).catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  const set = useCallback(
    (next: T | null | ((prev: T | null) => T | null)) => {
      setState((prev) => {
        if (!prev || prev.path !== path) return prev; // not loaded yet — ignore
        const resolved = typeof next === 'function' ? (next as (p: T | null) => T | null)(prev.value) : next;
        if (resolved === prev.value) return prev;
        dirty.current = { path, v: resolved };
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(flush, 250);
        return { path, value: resolved };
      });
    },
    [flush, path],
  );

  useEffect(() => flush, [flush]);

  const loaded = state !== null && state.path === path;
  return { value: loaded ? state.value : undefined, set, loaded };
}
