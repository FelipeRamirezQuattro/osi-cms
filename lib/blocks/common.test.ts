import { describe, expect, it } from "vitest";
import { blockCommonSchema } from "@/lib/blocks/common";

/**
 * Task 7 item #9: "image" was a fully dead background option —
 * components/ui/section.tsx rendered it identically to "transparent"
 * (both `bg-transparent`), and a preflight query against page_blocks
 * confirmed zero live rows used it. Removed from the enum rather than
 * built out into a real feature (see lib/blocks/common.ts's comment).
 */
describe("blockCommonSchema's background enum", () => {
  it("accepts navy/cream/transparent", () => {
    for (const background of ["navy", "cream", "transparent"] as const) {
      const result = blockCommonSchema.safeParse({ background });
      expect(result.success).toBe(true);
    }
  });

  it("rejects the removed 'image' option", () => {
    expect(blockCommonSchema.safeParse({ background: "image" }).success).toBe(false);
  });

  it("defaults to 'cream' when omitted", () => {
    const result = blockCommonSchema.safeParse({});
    expect(result.success && result.data.background).toBe("cream");
  });
});
