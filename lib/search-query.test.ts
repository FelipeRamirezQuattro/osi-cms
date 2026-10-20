import { describe, expect, it } from "vitest";
import { SEARCH_QUERY_MAX, escapeLikePattern, normalizeSearchQuery } from "@/lib/search-query";

describe("normalizeSearchQuery", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeSearchQuery("  gas \n\t release  ")).toBe("gas release");
  });
  it("removes control characters, including NUL", () => {
    expect(normalizeSearchQuery("gas\u0000release\u0007")).toBe("gas release");
  });
  it("caps very long input", () => {
    const out = normalizeSearchQuery("a".repeat(5000));
    expect(out).toHaveLength(SEARCH_QUERY_MAX);
  });
  it("keeps quotes, percent signs and unicode as typed", () => {
    expect(normalizeSearchQuery(`O'Brien 100% café`)).toBe(`O'Brien 100% café`);
  });
});

describe("escapeLikePattern", () => {
  it("escapes the three LIKE metacharacters", () => {
    expect(escapeLikePattern("100%_a\\b")).toBe("100\\%\\_a\\\\b");
  });
  it("leaves ordinary text alone", () => {
    expect(escapeLikePattern("sand control")).toBe("sand control");
  });
});
