"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const read = (key: string) => {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

/**
 * State kept in sessionStorage so a multi-step flow survives a reload or a
 * language switch. Returns `undefined` until the browser has hydrated.
 */
export function useSessionState<T>(key: string, initial: T): [T | undefined, (next: T | ((current: T) => T)) => void, () => void] {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => undefined,
  );
  const value = useMemo<T | undefined>(() => {
    if (raw === undefined) return undefined;
    if (raw === null) return initial;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
    // `initial` is a constant per call site
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw]);

  const set = useCallback(
    (next: T | ((current: T) => T)) => {
      const stored = read(key);
      let current = initial;
      if (stored) {
        try {
          current = JSON.parse(stored) as T;
        } catch {
          /* fall back to the initial value */
        }
      }
      const resolved = typeof next === "function" ? (next as (current: T) => T)(current) : next;
      try {
        window.sessionStorage.setItem(key, JSON.stringify(resolved));
      } catch {
        /* storage unavailable */
      }
      listeners.forEach((listener) => listener());
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  const clear = useCallback(() => {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      /* storage unavailable */
    }
    listeners.forEach((listener) => listener());
  }, [key]);

  return [value, set, clear];
}
