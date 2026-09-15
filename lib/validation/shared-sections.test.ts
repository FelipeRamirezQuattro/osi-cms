import { describe, expect, it } from "vitest";
import { createSharedSectionSchema, sharedSectionKeySchema } from "@/lib/validation/shared-sections";

describe("sharedSectionKeySchema", () => {
  it("accepts a lowercase hyphenated key", () => {
    expect(sharedSectionKeySchema.safeParse("footer-cta").success).toBe(true);
  });

  it("rejects uppercase letters", () => {
    expect(sharedSectionKeySchema.safeParse("Footer-CTA").success).toBe(false);
  });

  it("rejects spaces", () => {
    expect(sharedSectionKeySchema.safeParse("footer cta").success).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(sharedSectionKeySchema.safeParse("").success).toBe(false);
  });
});

describe("createSharedSectionSchema", () => {
  it("accepts a valid key + title", () => {
    const result = createSharedSectionSchema.safeParse({ key: "footer-cta", title: "Footer CTA" });
    expect(result.success).toBe(true);
  });

  it("rejects a blank title", () => {
    const result = createSharedSectionSchema.safeParse({ key: "footer-cta", title: "  " });
    expect(result.success).toBe(false);
  });
});
