import { describe, expect, it } from "vitest";
import { isLongTitle, longTitle } from "@/lib/text/long-title";

describe("long titles", () => {
  it("treats up to six words as title-length and more as a sentence", () => {
    expect(isLongTitle("Tailored solutions for your industry")).toBe(false);
    expect(isLongTitle("Your source for fluid conditioning systems")).toBe(false);
    expect(isLongTitle("Eliminates the need for workover operations resulting from sand failures.")).toBe(true);
  });
  it("is safe on empty values and collapses whitespace", () => {
    expect(isLongTitle(undefined)).toBe(false);
    expect(isLongTitle("   ")).toBe(false);
    expect(isLongTitle("one   two\nthree four five six")).toBe(false);
    expect(longTitle("a b c d e f g")).toEqual({ "data-long": "" });
    expect(longTitle("short")).toEqual({});
  });
});
