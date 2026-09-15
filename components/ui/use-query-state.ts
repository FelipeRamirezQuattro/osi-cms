"use client";

import { useMemo, useSyncExternalStore } from "react";

const QUERY_EVENT = "osi:query-state";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  window.addEventListener(QUERY_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener(QUERY_EVENT, onStoreChange);
  };
}

function getSnapshot() {
  return window.location.search;
}

function getServerSnapshot() {
  return "";
}

/**
 * URL-backed state for client-filtered public listings. Native history
 * integrates with the Next.js router and keeps Back/Forward behavior,
 * while this tiny store also makes the pattern deterministic in tests.
 */
export function useQueryState() {
  const search = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const params = useMemo(() => new URLSearchParams(search), [search]);

  function updateQuery(
    updates: Record<string, string | null>,
    mode: "push" | "replace" = "push",
  ) {
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === "all") next.delete(key);
      else next.set(key, value);
    }
    const query = next.toString();
    const href = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history[mode === "replace" ? "replaceState" : "pushState"](null, "", href);
    window.dispatchEvent(new Event(QUERY_EVENT));
  }

  return { params, updateQuery };
}
