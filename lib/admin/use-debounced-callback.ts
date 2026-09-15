"use client";

import { useEffect, useRef } from "react";

/**
 * Runs `callback` `delayMs` after the most recent change to `watchKey`,
 * restarting the timer on every change, and never scheduling one while
 * `enabled` is false — the debounce primitive behind the page/shared-
 * section editors' autosave (Task 13b). Deliberately generic and
 * independent of react-hook-form or any specific save action so it can
 * be unit tested with fake timers on its own.
 *
 * `callback` is read through a ref rather than added to the effect's
 * dependency array — it's a fresh closure every render (it closes over
 * current form values/state setters), and depending on it directly would
 * restart the timer on every render instead of only on a real
 * `watchKey`/`enabled` change.
 */
export function useDebouncedCallback({
  watchKey,
  delayMs,
  enabled,
  callback,
}: {
  watchKey: string;
  delayMs: number;
  enabled: boolean;
  callback: () => void;
}): void {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => callbackRef.current(), delayMs);
    return () => clearTimeout(timer);
  }, [watchKey, delayMs, enabled]);
}
