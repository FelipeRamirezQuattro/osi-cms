import { describe, expect, it } from "vitest";
import { OSI_SEED_BRANDING_CONFIG } from "@/lib/branding/seed";
import { compileBrandingTheme } from "@/lib/branding/theme";

function cloneSeed(): Record<string, unknown> {
  return structuredClone(OSI_SEED_BRANDING_CONFIG) as unknown as Record<string, unknown>;
}

describe("compileBrandingTheme", () => {
  it("produces deterministic, sorted variables for the OSI seed", () => {
    const first = compileBrandingTheme(OSI_SEED_BRANDING_CONFIG);
    const second = compileBrandingTheme(structuredClone(OSI_SEED_BRANDING_CONFIG));

    expect(first).toEqual(second);
    expect(Object.keys(first.style)).toEqual(Object.keys(first.style).toSorted());
    expect(first.usedFallback).toBe(false);
    expect(first.usedFontKeys).toEqual(["montserrat", "orbitron", "poppins"]);
    expect(first.style["--brand-color-primary"]).toBe("#001B33");
    expect(first.style["--color-brand-surface-dark"]).toBe("#001B33");
    expect(first.style["--color-brand-text-dark"]).toBe("#FFFFFF");
    expect(first.style["--brand-color-border-on-light"]).toBe(
      "color-mix(in srgb, #001B33 16%, transparent)",
    );
    expect(first.style["--brand-font-display"]).toBe("var(--font-catalog-orbitron), sans-serif");
    expect(first.style["--font-display-source"]).toBe("var(--brand-font-display)");
    expect(first.style["--color-osi-cream-100"]).toBe("#F2E9DE");
  });

  it("falls back atomically for unknown fonts or malformed configuration", () => {
    const badFont = cloneSeed();
    (badFont.typography as Record<string, unknown>).display =
      "url(https://attacker.invalid/font.woff2)";

    for (const input of [badFont, null, {}, { configVersion: 999 }]) {
      const result = compileBrandingTheme(input);
      expect(result.usedFallback).toBe(true);
      expect(result.config).toEqual(OSI_SEED_BRANDING_CONFIG);
      expect(JSON.stringify(result.style)).not.toContain("attacker.invalid");
    }
  });

  it("never interpolates editable names or notes into CSS", () => {
    const config = cloneSeed();
    const swatches = config.swatches as Array<Record<string, unknown>>;
    swatches[0].name = "</style><script>alert(1)</script>";
    swatches[0].note = "red; background-image:url(https://attacker.invalid/x)";

    const result = compileBrandingTheme(config);
    const output = JSON.stringify(result.style);
    expect(result.usedFallback).toBe(false);
    expect(output).not.toMatch(/<script|attacker\.invalid|background-image/i);
    expect(Object.keys(result.style).every((name) => /^--[a-z0-9-]+$/.test(name))).toBe(true);
  });

  it("rejects CSS injection attempts in values and stable IDs", () => {
    const badHex = cloneSeed();
    (badHex.swatches as Array<Record<string, unknown>>)[0].hex = "#001B33;display:none";
    const badId = cloneSeed();
    (badId.swatches as Array<Record<string, unknown>>)[0].id = "primary};body{display:none";

    expect(compileBrandingTheme(badHex).usedFallback).toBe(true);
    expect(compileBrandingTheme(badId).usedFallback).toBe(true);
  });
});
