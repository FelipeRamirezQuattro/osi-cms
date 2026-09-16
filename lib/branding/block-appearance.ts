import type { CSSProperties } from "react";
import type { BlockAppearance, BlockBackground } from "@/lib/blocks/common";
import type { BlockAppearanceCapabilities } from "@/lib/blocks/types";
import { getFontCssStack, type FontCatalogKey } from "@/lib/fonts/catalog";

export type BlockThemeStyle = CSSProperties & Record<`--${string}`, string>;

const LEGACY_SURFACES: Record<BlockBackground, string> = {
  navy: "primary-dark",
  cream: "reading-light",
  transparent: "transparent-inherit",
};

function safeId(value: string | null | undefined): string | null {
  return value && /^[a-z][a-z0-9-]{0,39}$/.test(value) ? value : null;
}

function presetVar(id: string, slot: string, fallback: string): string {
  return `var(--brand-surface-${id}-${slot}, ${fallback})`;
}

export function resolveBlockAppearanceStyle({
  blockType,
  legacyBackground,
  appearance,
  capabilities,
}: {
  blockType: string;
  legacyBackground: BlockBackground;
  appearance: BlockAppearance | undefined;
  capabilities: BlockAppearanceCapabilities;
}): { style: BlockThemeStyle; source: "legacy" | "block-default" | "instance" } {
  const typePrefix = `--brand-block-${blockType.replaceAll("_", "-")}`;
  const source = appearance === undefined ? "legacy" : "block-default";
  const legacyPreset = LEGACY_SURFACES[legacyBackground];
  const selectedPreset = safeId(appearance?.surfacePresetId);
  const blockFallback = `var(${typePrefix}`;
  const style: BlockThemeStyle = {};

  for (const slot of ["background", "text", "muted-text", "accent", "border"] as const) {
    const fallback = `${blockFallback}-${slot}, var(--brand-color-${slot === "background" ? "light-surface" : slot === "text" ? "text-on-light" : slot === "muted-text" ? "muted-text-on-light" : slot === "accent" ? "accent-on-light" : "border-on-light"}))`;
    style[`--block-${slot}`] = appearance === undefined
      ? presetVar(legacyPreset, slot, fallback)
      : selectedPreset
        ? presetVar(selectedPreset, slot, fallback)
        : fallback;
  }

  if (capabilities.accent) {
    const accentId = safeId(appearance?.accentSwatchId);
    // Terminal literal fallback matches the same "-on-light" default the
    // slot loop above uses — a deleted/dangling swatch reference degrades
    // to a real brand color instead of resolving to nothing.
    if (accentId) style["--block-accent"] = `var(--brand-swatch-${accentId}, var(${typePrefix}-accent, var(--brand-color-accent-on-light)))`;
  }

  for (const slot of capabilities.typography) {
    const fontId = safeId(appearance?.typography?.[slot]);
    // getFontCssStack (not a hand-rolled var() chain) so a system-catalog
    // entry (system-sans/system-serif, cssVariable: null) resolves to its
    // real font stack instead of an undefined `var(--font-catalog-...)`
    // reference silently discarding the whole font-family declaration.
    style[`--block-font-${slot}`] = fontId
      ? getFontCssStack(fontId as FontCatalogKey)
      : `var(${typePrefix}-font-${slot}, var(--brand-font-${slot}))`;
  }

  return {
    style,
    source: selectedPreset || appearance?.accentSwatchId || Object.values(appearance?.typography ?? {}).some(Boolean)
      ? "instance"
      : source,
  };
}
