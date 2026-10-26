/**
 * Column count for a card grid that never strands one card alone on its last
 * row. A count is valid when the last row is full or holds at least two cards.
 * The two widest counts (`max` and `max - 1`) are tried first - the fullest
 * last row wins, then the wider grid - so a long list never collapses to a
 * tall two-column stack on a wide screen. Only when neither is valid does the
 * search continue down to two columns, and then one (always valid).
 *
 *   6 items, max 4 -> 3 (3+3)      10 items, max 4 -> 4 (4+4+2)
 *   5 items, max 4 -> 3 (3+2)      3 items, max 2 -> 1 (stacked, never 2+1)
 */
export function balancedColumns(count: number, max: number): number {
  if (!Number.isFinite(count) || count <= 1 || max <= 1) return 1;
  const widest = Math.min(Math.floor(max), count);
  const pick = (from: number, to: number): number | null => {
    let best: number | null = null;
    let bestFill = -1;
    for (let cols = from; cols >= to; cols--) {
      const lastRow = count % cols || cols;
      if (lastRow < 2) continue;
      const fill = lastRow / cols;
      if (fill > bestFill) {
        best = cols;
        bestFill = fill;
      }
    }
    return best;
  };
  return pick(widest, Math.max(2, widest - 1)) ?? pick(widest - 2, 2) ?? 1;
}

/** Max columns per breakpoint (`sm` 640px, `lg` 1024px, `xl` 1280px); below `sm` is always one column. */
export const CARD_GRID_MAX = { sm: 2, lg: 3, xl: 4 } as const;

export type CardGridColumns = { sm: number; lg: number; xl: number };

export function cardGridColumns(count: number): CardGridColumns {
  return {
    sm: balancedColumns(count, CARD_GRID_MAX.sm),
    lg: balancedColumns(count, CARD_GRID_MAX.lg),
    xl: balancedColumns(count, CARD_GRID_MAX.xl),
  };
}
