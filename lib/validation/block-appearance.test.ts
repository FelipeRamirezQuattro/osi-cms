import { describe, expect, it } from "vitest";
import { validateBlockAppearanceReferences } from "@/lib/validation/block-appearance";
import { OSI_SEED_BRANDING_CONFIG } from "@/lib/branding/seed";

describe("validateBlockAppearanceReferences", () => {
  it("accepts published choices and rejects dangling tokens", () => {
    expect(validateBlockAppearanceReferences([{ type: "rich_text", data: { appearance: { surfacePresetId: "reading-light", typography: { body: "poppins" } } } }], OSI_SEED_BRANDING_CONFIG)).toBeNull();
    expect(validateBlockAppearanceReferences([{ type: "rich_text", data: { appearance: { surfacePresetId: "deleted-preset" } } }], OSI_SEED_BRANDING_CONFIG)?.field).toBe("appearance.surfacePresetId");
  });

  it("rejects a slot the block did not declare", () => {
    expect(validateBlockAppearanceReferences([{ type: "image", data: { appearance: { typography: { heading: "montserrat" } } } }], OSI_SEED_BRANDING_CONFIG)?.field).toBe("appearance.typography.heading");
  });
});
