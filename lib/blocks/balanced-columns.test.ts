import { describe, expect, it } from "vitest";
import { balancedColumns, cardGridColumns, CARD_GRID_MAX } from "./balanced-columns";

describe("balancedColumns", () => {
  it.each([
    [1, 4, 1],
    [2, 4, 2],
    [3, 4, 3],
    [4, 4, 4],
    [5, 4, 3],
    [6, 4, 3],
    [7, 4, 4],
    [8, 4, 4],
    [9, 4, 3],
    [10, 4, 4],
    [11, 4, 4],
    [12, 4, 4],
  ])("%i items, max %i columns -> %i", (count, max, expected) => {
    expect(balancedColumns(count, max)).toBe(expected);
  });

  it("falls back to fewer columns rather than leave an odd card alone", () => {
    expect(balancedColumns(3, 2)).toBe(1);
    expect(balancedColumns(5, 2)).toBe(1);
    expect(balancedColumns(7, 3)).toBe(1); // 3 and 2 columns would both leave one alone
  });

  it("is safe for degenerate input", () => {
    expect(balancedColumns(0, 4)).toBe(1);
    expect(balancedColumns(-3, 4)).toBe(1);
    expect(balancedColumns(5, 0)).toBe(1);
    expect(balancedColumns(Number.NaN, 4)).toBe(1);
  });

  it("never strands a single card on the last row, for 1-12 items at every max", () => {
    for (let count = 1; count <= 12; count++) {
      for (const max of [1, 2, 3, 4, 5, 6]) {
        const cols = balancedColumns(count, max);
        expect(cols).toBeGreaterThanOrEqual(1);
        expect(cols).toBeLessThanOrEqual(Math.max(1, Math.min(max, count)));
        if (cols > 1) expect(count % cols).not.toBe(1);
      }
    }
  });
});

describe("cardGridColumns", () => {
  it("balances each breakpoint independently", () => {
    expect(cardGridColumns(6)).toEqual({ sm: 2, lg: 3, xl: 3 });
    expect(cardGridColumns(4)).toEqual({ sm: 2, lg: 2, xl: 4 });
    expect(cardGridColumns(3)).toEqual({ sm: 1, lg: 3, xl: 3 });
    expect(cardGridColumns(12)).toEqual({ sm: 2, lg: 3, xl: 4 });
  });

  it("respects the per-breakpoint maximums", () => {
    for (let n = 1; n <= 12; n++) {
      const c = cardGridColumns(n);
      expect(c.sm).toBeLessThanOrEqual(CARD_GRID_MAX.sm);
      expect(c.lg).toBeLessThanOrEqual(CARD_GRID_MAX.lg);
      expect(c.xl).toBeLessThanOrEqual(CARD_GRID_MAX.xl);
    }
  });
});
