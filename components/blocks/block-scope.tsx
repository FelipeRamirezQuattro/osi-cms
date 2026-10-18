import type { ReactNode } from "react";

/**
 * Gives a block Render that is composed directly (not through BlockRenderer —
 * the fixed sections of a product page) the same `data-block-type` hook that
 * BlockRenderer's wrapper provides, so theme styles that key off the block
 * type apply identically. `display: contents` keeps layout untouched.
 */
export function BlockScope({ type, children }: { type: string; children: ReactNode }) {
  return (
    <div data-block-type={type} className="contents">
      {children}
    </div>
  );
}
