"use client";

import { useEffect } from "react";

const STORAGE_KEY = "osi:viewed";
const MAX_ENTRIES = 8;

// Writes to localStorage on mount so the recommendations block (see
// components/blocks/recommendations-client.tsx) can read it back later.
// A genuine external-system side effect, not state derived from props.
export function RecordProductView({ slug }: { slug: string }) {
  useEffect(() => {
    try {
      const existing: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      const next = [slug, ...existing.filter((s) => s !== slug)].slice(0, MAX_ENTRIES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage unavailable — recommendations just won't personalize.
    }
  }, [slug]);

  return null;
}
