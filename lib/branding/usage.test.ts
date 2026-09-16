import { describe, expect, it } from "vitest";
import { configReferencesBrandToken, jsonReferencesBrandToken } from "@/lib/branding/usage";
import { OSI_SEED_BRANDING_CONFIG } from "@/lib/branding/seed";

describe("brand token usage", () => {
  it("matches exact token values, not substrings", () => {
    expect(jsonReferencesBrandToken({ appearance: { accentSwatchId: "signal" } }, "signal")).toBe(true);
    expect(jsonReferencesBrandToken({ appearance: { accentSwatchId: "signal-dark" } }, "signal")).toBe(false);
  });

  it("does not count a swatch declaration as its own usage", () => {
    const config = structuredClone(OSI_SEED_BRANDING_CONFIG);
    config.swatches.push({ id: "unused-custom", name: "Unused", hex: "#123456", category: "system", note: null, isCustom: true });
    expect(configReferencesBrandToken(config, "unused-custom")).toBe(false);
    expect(configReferencesBrandToken(config, "osi-navy-900")).toBe(true);
  });
});
