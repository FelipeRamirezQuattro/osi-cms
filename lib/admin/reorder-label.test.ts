import { describe, expect, it } from "vitest";
import { reorderAriaLabel } from "@/lib/admin/reorder-label";

describe("reorderAriaLabel", () => {
  it("falls back to a generic label when no item label is given", () => {
    expect(reorderAriaLabel("up")).toBe("Move up");
    expect(reorderAriaLabel("down")).toBe("Move down");
  });

  it("folds the item's own label into the accessible name", () => {
    expect(reorderAriaLabel("up", "Hero")).toBe("Move Hero up");
    expect(reorderAriaLabel("down", "Gas Release System")).toBe("Move Gas Release System down");
  });

  it("treats an empty or whitespace-only label the same as no label", () => {
    expect(reorderAriaLabel("up", "")).toBe("Move up");
    expect(reorderAriaLabel("up", "   ")).toBe("Move up");
  });

  it("trims surrounding whitespace from a real label", () => {
    expect(reorderAriaLabel("down", "  Benefits card  ")).toBe("Move Benefits card down");
  });
});
