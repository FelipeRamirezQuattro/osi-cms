import { describe, expect, it } from "vitest";
import { blockRegistry } from "@/lib/blocks/registry";
import {
  BLOCK_TYPE_KEYS,
  brandingConfigSchema,
  compositeOverBackground,
  contrastRatio,
  relativeLuminance,
  safeParseBrandingConfig,
} from "@/lib/branding/schema";
import { OSI_SEED_BRANDING_CONFIG } from "@/lib/branding/seed";

/**
 * Branding schema test matrix — this is the exact row from the Phase 1
 * brief's "Test matrix" table: "valid OSI seed, malformed hex, duplicate
 * IDs, missing role, unknown font, invalid block key, bad schema version".
 */

describe("BLOCK_TYPE_KEYS stays in sync with the real block registry", () => {
  it("matches lib/blocks/registry.ts exactly", () => {
    expect([...BLOCK_TYPE_KEYS].sort()).toEqual(Object.keys(blockRegistry).sort());
  });
});

describe("contrast math", () => {
  it("white on white has a contrast ratio of 1", () => {
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
  });

  it("black on white has the maximum contrast ratio of 21", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
  });

  it("relativeLuminance of pure white is 1 and pure black is 0", () => {
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 5);
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
  });

  it("compositeOverBackground at alpha 0 returns the background unchanged", () => {
    expect(compositeOverBackground("#000000", 0, "#F2E9DE")).toBe("#F2E9DE");
  });

  it("compositeOverBackground at alpha 1 returns the foreground unchanged", () => {
    expect(compositeOverBackground("#001B33", 1, "#F2E9DE")).toBe("#001B33");
  });
});

describe("brandingConfigSchema", () => {
  it("accepts the real seeded OSI configuration", () => {
    const result = safeParseBrandingConfig(OSI_SEED_BRANDING_CONFIG);
    if (!result.success) {
      // Surface the actual Zod issues in the failure message for fast debugging.
      throw new Error(JSON.stringify(result.error.issues, null, 2));
    }
    expect(result.success).toBe(true);
  });

  it("rejects a malformed hex value (alpha channel)", () => {
    const config = structuredClone(OSI_SEED_BRANDING_CONFIG);
    config.swatches[0]!.hex = "#001B33FF" as never;
    expect(brandingConfigSchema.safeParse(config).success).toBe(false);
  });

  it("rejects a CSS function used as a hex value", () => {
    const config = structuredClone(OSI_SEED_BRANDING_CONFIG);
    config.swatches[0]!.hex = "rgb(0, 27, 51)" as never;
    expect(brandingConfigSchema.safeParse(config).success).toBe(false);
  });

  it("rejects a url() used as a hex value", () => {
    const config = structuredClone(OSI_SEED_BRANDING_CONFIG);
    config.swatches[0]!.hex = "url(#gradient)" as never;
    expect(brandingConfigSchema.safeParse(config).success).toBe(false);
  });

  it("rejects duplicate swatch IDs", () => {
    const config = structuredClone(OSI_SEED_BRANDING_CONFIG);
    config.swatches[1]!.id = config.swatches[0]!.id;
    expect(brandingConfigSchema.safeParse(config).success).toBe(false);
  });

  it("rejects duplicate swatch names", () => {
    const config = structuredClone(OSI_SEED_BRANDING_CONFIG);
    config.swatches[1]!.name = config.swatches[0]!.name;
    expect(brandingConfigSchema.safeParse(config).success).toBe(false);
  });

  it("rejects a config missing a required semantic role", () => {
    const config = structuredClone(OSI_SEED_BRANDING_CONFIG) as Record<string, unknown>;
    const roles = config.roles as Record<string, unknown>;
    delete roles.accentOnDark;
    expect(brandingConfigSchema.safeParse(config).success).toBe(false);
  });

  it("rejects an unknown font catalog key", () => {
    const config = structuredClone(OSI_SEED_BRANDING_CONFIG);
    config.typography.heading = "comic-sans" as never;
    expect(brandingConfigSchema.safeParse(config).success).toBe(false);
  });

  it("rejects a font assigned to a role it doesn't allow", () => {
    const config = structuredClone(OSI_SEED_BRANDING_CONFIG);
    // "orbitron" only allows the "display" role per the catalog.
    config.typography.body = "orbitron" as never;
    expect(brandingConfigSchema.safeParse(config).success).toBe(false);
  });

  it("rejects an unknown/invalid block-type key", () => {
    const config = structuredClone(OSI_SEED_BRANDING_CONFIG) as unknown as Record<string, unknown>;
    const blockDefaults = config.blockDefaults as Record<string, unknown>;
    // Deliberately does NOT also delete a real key (hero_full) — every
    // block-type key is optional now (see blockDefaultsSchema's comment),
    // so this test must add an unrecognized key WITHOUT removing a valid
    // one, or it would pass even without the schema's `.strict()`.
    blockDefaults.not_a_real_block_type = { surfacePresetId: null, accentSwatchId: null, typography: {} };
    expect(brandingConfigSchema.safeParse(config).success).toBe(false);
  });

  it("accepts a config missing a block-type key (that block type inherits site-wide defaults)", () => {
    const config = structuredClone(OSI_SEED_BRANDING_CONFIG) as unknown as Record<string, unknown>;
    const blockDefaults = config.blockDefaults as Record<string, unknown>;
    delete blockDefaults.hero_full;
    expect(brandingConfigSchema.safeParse(config).success).toBe(true);
  });

  it("rejects an unsupported schema version", () => {
    const config = { ...structuredClone(OSI_SEED_BRANDING_CONFIG), configVersion: 2 };
    expect(brandingConfigSchema.safeParse(config).success).toBe(false);
  });

  it("rejects a missing schema version", () => {
    const config = structuredClone(OSI_SEED_BRANDING_CONFIG) as unknown as Record<string, unknown>;
    delete config.configVersion;
    expect(brandingConfigSchema.safeParse(config).success).toBe(false);
  });

  it("rejects a focus indicator that doesn't resolve to the fixed accessible color", () => {
    const config = structuredClone(OSI_SEED_BRANDING_CONFIG);
    config.roles.focusIndicator.swatchId = "osi-gold-500";
    expect(brandingConfigSchema.safeParse(config).success).toBe(false);
  });

  it("rejects a surface preset whose text fails WCAG AA contrast against its background", () => {
    const config = structuredClone(OSI_SEED_BRANDING_CONFIG);
    // gold-500 on cream fails AA (that's exactly why accentOnLight exists) —
    // repurposed here as a too-low-contrast "text" color on reading-light.
    const preset = config.surfacePresets.find((p) => p.id === "reading-light")!;
    preset.textSwatchId = "osi-gold-500";
    expect(brandingConfigSchema.safeParse(config).success).toBe(false);
  });

  it("rejects a status role (error/success/warning/info) that fails WCAG AA contrast against the light surface", () => {
    // Regression test: an earlier seed shipped `osi-status-warning` at
    // #B45309 (4.18:1 on osi-cream-100 — below the 4.5:1 AA threshold)
    // because nothing contrast-checked the status roles at all. Asserted
    // here against a swatch known to fail (gold-500, accessible on navy
    // only) so this test fails loudly if that check is ever removed,
    // independent of whatever hex the seed currently uses.
    const config = structuredClone(OSI_SEED_BRANDING_CONFIG);
    config.roles.warning.swatchId = "osi-gold-500";
    expect(brandingConfigSchema.safeParse(config).success).toBe(false);
  });

  it("accepts the real seeded status roles against the light surface (no regression of the #B45309 warning-contrast bug)", () => {
    // The seed's actual current values must clear AA — this is the
    // seed-fidelity half of the regression test above.
    expect(brandingConfigSchema.safeParse(OSI_SEED_BRANDING_CONFIG).success).toBe(true);
  });

  it("rejects an active brand palette over the 12-swatch cap", () => {
    const config = structuredClone(OSI_SEED_BRANDING_CONFIG);
    config.swatches.push({
      id: "osi-extra-brand-swatch",
      name: "Extra brand swatch",
      hex: "#123456",
      category: "brand",
      note: null,
      isCustom: true,
    });
    expect(brandingConfigSchema.safeParse(config).success).toBe(false);
  });

  it("rejects a logo alt text of exactly 'logo'", () => {
    const config = structuredClone(OSI_SEED_BRANDING_CONFIG);
    config.logo.altText = "Logo";
    expect(brandingConfigSchema.safeParse(config).success).toBe(false);
  });

  it("rejects a dangling swatch reference", () => {
    const config = structuredClone(OSI_SEED_BRANDING_CONFIG);
    config.roles.primary.swatchId = "does-not-exist";
    expect(brandingConfigSchema.safeParse(config).success).toBe(false);
  });
});
