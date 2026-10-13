import { describe, expect, it } from "vitest";
import { validateBlockList } from "@/lib/validation/blocks";

const common = { background: "cream", spacingTop: "md", spacingBottom: "md" };

describe("validateBlockList — plain-English messages (BLQ-02, BLQ-05, BLQ-34)", () => {
  it("explains a too-short array with the field's admin label and the current count", () => {
    const result = validateBlockList([
      { type: "columns", data: { ...common, columns: [{ type: "text", heading: "One" }] } },
    ]);
    expect(result).toMatchObject({ status: "error", blockIndex: 0 });
    expect(result!.message).toBe("Columns block (position 1): add at least 2 columns (you have 1).");
    expect(result!.message).not.toMatch(/Too small|expected array/);
  });

  it("reports every missing required field on an AR model, by admin label", () => {
    const result = validateBlockList([
      { type: "ar_model", data: { ...common, glbUrl: "", usdzUrl: "", alt: "" } },
    ]);
    expect(result!.message).toContain("AR model block (position 1):");
    expect(result!.message).toContain("3D model (.glb) is required");
    expect(result!.message).toContain("iOS AR model (.usdz) is required");
    expect(result!.message).toContain("Alt text is required");
    expect(result!.message).not.toContain("must be a .glb"); // one message per field
    expect(result!.field).toBe("glbUrl");
  });

  it("names the block position so the editor can find it", () => {
    const result = validateBlockList([
      { type: "ar_model", data: { ...common, glbUrl: "a.glb", usdzUrl: "a.usdz", alt: "ok" } },
      { type: "columns", data: { ...common, columns: [] } },
    ]);
    expect(result).toMatchObject({ blockIndex: 1 });
    expect(result!.message).toContain("(position 2)");
  });
});
