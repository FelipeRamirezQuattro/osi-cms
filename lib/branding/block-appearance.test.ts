import { describe, expect, it } from "vitest";
import { resolveBlockAppearanceStyle } from "@/lib/branding/block-appearance";

const capabilities = { surface: true, accent: true, typography: ["heading", "body"] as const };

describe("resolveBlockAppearanceStyle", () => {
  it("adapts legacy backgrounds without rewriting stored JSON", () => {
    const result = resolveBlockAppearanceStyle({ blockType: "rich_text", legacyBackground: "navy", appearance: undefined, capabilities });
    expect(result.source).toBe("legacy");
    expect(result.style["--block-background"]).toContain("--brand-surface-primary-dark-background");
  });

  it("uses block defaults for an empty new appearance object", () => {
    const result = resolveBlockAppearanceStyle({ blockType: "rich_text", legacyBackground: "navy", appearance: {}, capabilities });
    expect(result.source).toBe("block-default");
    expect(result.style["--block-background"]).toContain("--brand-block-rich-text-background");
  });

  it("resolves approved instance slots through safe variable names", () => {
    const result = resolveBlockAppearanceStyle({
      blockType: "rich_text",
      legacyBackground: "cream",
      appearance: { surfacePresetId: "technical-plate", accentSwatchId: "osi-gold-700", typography: { heading: "fraunces" } },
      capabilities,
    });
    expect(result.source).toBe("instance");
    expect(result.style["--block-background"]).toContain("--brand-surface-technical-plate-background");
    expect(result.style["--block-accent"]).toContain("--brand-swatch-osi-gold-700");
    expect(result.style["--block-font-heading"]).toContain("--font-catalog-fraunces");
  });
});
