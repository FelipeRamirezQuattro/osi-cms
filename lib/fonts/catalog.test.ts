import { describe, expect, it } from "vitest";
import {
  FONT_CATALOG,
  TYPOGRAPHY_SLOTS,
  getFontCatalogEntry,
  getFontCssStack,
  type FontCatalogKey,
} from "@/lib/fonts/catalog";

describe("font catalog", () => {
  it("contains the nine vetted, uniquely keyed entries", () => {
    const keys = FONT_CATALOG.map((entry) => entry.key);
    expect(keys).toHaveLength(9);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toEqual(
      expect.arrayContaining(["orbitron", "montserrat", "poppins", "system-sans", "system-serif"]),
    );
  });

  it("records complete loading and licensing metadata", () => {
    for (const entry of FONT_CATALOG) {
      expect(entry.family).toBeTruthy();
      expect(entry.fallbackStack).toBeTruthy();
      expect(entry.source).toBeTruthy();
      expect(entry.license).toBeTruthy();
      expect(entry.weights.length).toBeGreaterThan(0);
      expect(entry.styles.length).toBeGreaterThan(0);
      expect(entry.subsets.length).toBeGreaterThan(0);
      expect(entry.sample).toBeTruthy();
      expect(entry.allowedRoles.every((role) => TYPOGRAPHY_SLOTS.includes(role))).toBe(true);
      expect(
        entry.loadingStrategy === "system"
          ? entry.cssVariable === null
          : entry.cssVariable !== null,
      ).toBe(true);
    }
  });

  it("returns only code-owned CSS stacks", () => {
    for (const entry of FONT_CATALOG) {
      const stack = getFontCssStack(entry.key as FontCatalogKey);
      expect(stack).not.toMatch(/[;{}]|url\(|@import/i);
      if (entry.cssVariable) expect(stack).toContain(`var(${entry.cssVariable})`);
    }
    expect(getFontCatalogEntry("not-a-font")).toBeUndefined();
  });
});
