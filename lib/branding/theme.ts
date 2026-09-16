import type { CSSProperties } from "react";
import { OSI_SEED_BRANDING_CONFIG } from "@/lib/branding/seed";
import {
  brandingConfigSchema,
  type BrandingConfig,
  type RoleColorRef,
  type SemanticRoles,
} from "@/lib/branding/schema";
import { getFontCssStack, type FontCatalogKey } from "@/lib/fonts/catalog";

export type BrandingThemeStyle = CSSProperties & Record<`--${string}`, string | number>;

export type CompiledBrandingTheme = {
  config: BrandingConfig;
  style: BrandingThemeStyle;
  usedFontKeys: FontCatalogKey[];
  usedFallback: boolean;
};

const FALLBACK_CONFIG = brandingConfigSchema.parse(OSI_SEED_BRANDING_CONFIG);

const ROLE_VARIABLES = {
  primary: "--brand-color-primary",
  secondary: "--brand-color-secondary",
  accentOnDark: "--brand-color-accent-on-dark",
  accentOnLight: "--brand-color-accent-on-light",
  lightSurface: "--brand-color-light-surface",
  darkSurface: "--brand-color-dark-surface",
  textOnLight: "--brand-color-text-on-light",
  textOnDark: "--brand-color-text-on-dark",
  mutedTextOnLight: "--brand-color-muted-text-on-light",
  mutedTextOnDark: "--brand-color-muted-text-on-dark",
  borderOnLight: "--brand-color-border-on-light",
  borderOnDark: "--brand-color-border-on-dark",
  focusIndicator: "--brand-color-focus-indicator",
  error: "--brand-color-error",
  success: "--brand-color-success",
  warning: "--brand-color-warning",
  info: "--brand-color-info",
} as const satisfies Record<keyof SemanticRoles, `--${string}`>;

const LEGACY_ROLE_ALIASES = {
  "--color-osi-navy-900": "primary",
  "--color-osi-navy-700": "secondary",
  "--color-osi-steel-500": "info",
  "--color-osi-slate-300": "mutedTextOnLight",
  "--color-osi-slate-200": "mutedTextOnDark",
  "--color-osi-cream-100": "lightSurface",
  "--color-osi-gold-500": "accentOnDark",
  "--color-osi-gold-700": "accentOnLight",
  "--color-osi-white": "textOnDark",
} as const satisfies Record<`--${string}`, keyof SemanticRoles>;

const LEGACY_SWATCH_ALIASES = {
  "--color-osi-navy-600": "osi-navy-600",
  "--color-osi-slate-400": "osi-slate-400",
  "--color-osi-sand-300": "osi-sand-300",
  "--color-osi-gold-400": "osi-gold-400",
} as const satisfies Record<`--${string}`, string>;

function percentage(opacity: number): string {
  return String(Math.round(opacity * 10_000) / 100);
}

function colorValue(ref: RoleColorRef, swatches: ReadonlyMap<string, string>): string {
  const hex = swatches.get(ref.swatchId) ?? "#000000";
  if (ref.opacity === 1) return hex;
  return `color-mix(in srgb, ${hex} ${percentage(ref.opacity)}%, transparent)`;
}

function surfaceValue(swatchId: string | null, swatches: ReadonlyMap<string, string>): string {
  if (swatchId === null) return "inherit";
  return swatches.get(swatchId) ?? "inherit";
}

function add(entries: Array<[string, string]>, name: string, value: string) {
  entries.push([name, value]);
}

/**
 * Compiles validated branding data into CSS custom properties only. Invalid
 * input falls back as one unit to the built-in OSI theme, so a partial or
 * hostile configuration can never leak arbitrary CSS into server HTML.
 */
export function compileBrandingTheme(input: unknown): CompiledBrandingTheme {
  const parsed = brandingConfigSchema.safeParse(input);
  const config = parsed.success ? parsed.data : FALLBACK_CONFIG;
  const usedFallback = !parsed.success;
  const entries: Array<[string, string]> = [];
  const swatches = new Map(config.swatches.map((swatch) => [swatch.id, swatch.hex]));
  const fallbackSwatches = new Map(
    FALLBACK_CONFIG.swatches.map((swatch) => [swatch.id, swatch.hex]),
  );

  for (const swatch of [...config.swatches].sort((a, b) => a.id.localeCompare(b.id))) {
    add(entries, `--brand-swatch-${swatch.id}`, swatch.hex);
  }

  for (const role of Object.keys(ROLE_VARIABLES) as Array<keyof SemanticRoles>) {
    add(entries, ROLE_VARIABLES[role], colorValue(config.roles[role], swatches));
  }

  // Tailwind's semantic color utilities read `--color-brand-*`. These
  // aliases must be defined on the runtime boundary itself: defining a
  // var()-based alias only at :root resolves before the boundary's dynamic
  // `--brand-color-*` values exist and becomes invalid at computed-value
  // time, leaving dark chrome transparent.
  add(entries, "--color-brand-primary", colorValue(config.roles.primary, swatches));
  add(entries, "--color-brand-secondary", colorValue(config.roles.secondary, swatches));
  add(entries, "--color-brand-accent-dark", colorValue(config.roles.accentOnDark, swatches));
  add(entries, "--color-brand-accent-light", colorValue(config.roles.accentOnLight, swatches));
  add(entries, "--color-brand-surface-light", colorValue(config.roles.lightSurface, swatches));
  add(entries, "--color-brand-surface-dark", colorValue(config.roles.darkSurface, swatches));
  add(entries, "--color-brand-text-light", colorValue(config.roles.textOnLight, swatches));
  add(entries, "--color-brand-text-dark", colorValue(config.roles.textOnDark, swatches));

  for (const preset of [...config.surfacePresets].sort((a, b) => a.id.localeCompare(b.id))) {
    const prefix = `--brand-surface-${preset.id}`;
    add(
      entries,
      `${prefix}-background`,
      preset.mode === "transparent"
        ? "transparent"
        : surfaceValue(preset.backgroundSwatchId, swatches),
    );
    // A `null` swatch id (only "transparent-inherit" today) means "no brand
    // opinion for this slot" — that must leave the property UNDEFINED so a
    // consumer's `var(--brand-surface-<id>-<slot>, <real fallback>)` chain
    // actually falls through. `surfaceValue`'s own "inherit" string is a
    // DEFINED value: it would satisfy var() and short-circuit that fallback,
    // which is exactly how a transparent-background block was silently
    // losing its accent color (and would lose text/muted-text/border the
    // same way for any future preset shaped like this one).
    if (preset.textSwatchId !== null) add(entries, `${prefix}-text`, surfaceValue(preset.textSwatchId, swatches));
    if (preset.mutedTextSwatchId !== null) add(entries, `${prefix}-muted-text`, surfaceValue(preset.mutedTextSwatchId, swatches));
    if (preset.accentSwatchId !== null) add(entries, `${prefix}-accent`, surfaceValue(preset.accentSwatchId, swatches));
    if (preset.borderSwatchId !== null) add(entries, `${prefix}-border`, surfaceValue(preset.borderSwatchId, swatches));
  }

  for (const [blockType, defaults] of Object.entries(config.blockDefaults).sort(([a], [b]) => a.localeCompare(b))) {
    if (!defaults) continue;
    const prefix = `--brand-block-${blockType.replaceAll("_", "-")}`;
    const preset = defaults.surfacePresetId
      ? config.surfacePresets.find((item) => item.id === defaults.surfacePresetId)
      : undefined;
    const fallbackSurface = config.surfacePresets.find((item) => item.id === "reading-light");
    const resolvedPreset = preset ?? fallbackSurface;
    if (resolvedPreset) {
      add(entries, `${prefix}-background`, resolvedPreset.mode === "transparent" ? "transparent" : surfaceValue(resolvedPreset.backgroundSwatchId, swatches));
      add(entries, `${prefix}-text`, surfaceValue(resolvedPreset.textSwatchId, swatches));
      add(entries, `${prefix}-muted-text`, surfaceValue(resolvedPreset.mutedTextSwatchId, swatches));
      add(entries, `${prefix}-border`, surfaceValue(resolvedPreset.borderSwatchId, swatches));
      add(entries, `${prefix}-accent`, defaults.accentSwatchId
        ? surfaceValue(defaults.accentSwatchId, swatches)
        : surfaceValue(resolvedPreset.accentSwatchId, swatches));
    }
    for (const [slot, fontKey] of Object.entries(defaults.typography)) {
      if (fontKey) add(entries, `${prefix}-font-${slot}`, getFontCssStack(fontKey));
    }
  }

  const fontRoles = {
    display: getFontCssStack(config.typography.display),
    heading: getFontCssStack(config.typography.heading),
    body: getFontCssStack(config.typography.body),
    label: getFontCssStack(config.typography.label),
  };
  add(entries, "--brand-font-display", fontRoles.display);
  add(entries, "--brand-font-heading", fontRoles.heading);
  add(entries, "--brand-font-body", fontRoles.body);
  add(entries, "--brand-font-label", fontRoles.label);
  add(entries, "--font-display-source", "var(--brand-font-display)");
  add(entries, "--font-editorial-source", "var(--brand-font-heading)");
  add(entries, "--font-body-source", "var(--brand-font-body)");
  add(entries, "--font-label-source", "var(--brand-font-label)");

  // Compatibility bridge for Phase 2. Phase 3 replaces direct OSI utility
  // decisions with semantic aliases, while this preserves the seeded pixels
  // and already lets the principal roles respond to a published theme.
  for (const [variable, role] of Object.entries(LEGACY_ROLE_ALIASES)) {
    add(entries, variable, colorValue(config.roles[role], swatches));
  }
  for (const [variable, swatchId] of Object.entries(LEGACY_SWATCH_ALIASES)) {
    add(entries, variable, swatches.get(swatchId) ?? fallbackSwatches.get(swatchId) ?? "#000000");
  }

  const technicalPreset = config.surfacePresets.find((preset) => preset.id === "technical-plate");
  add(entries, "--site-surface", colorValue(config.roles.lightSurface, swatches));
  add(
    entries,
    "--site-surface-raised",
    surfaceValue(technicalPreset?.backgroundSwatchId ?? null, swatches),
  );
  add(entries, "--site-ink", colorValue(config.roles.textOnLight, swatches));
  add(entries, "--site-ink-muted", colorValue(config.roles.mutedTextOnLight, swatches));
  add(entries, "--site-border", colorValue(config.roles.borderOnLight, swatches));
  add(entries, "--site-border-on-dark", colorValue(config.roles.borderOnDark, swatches));

  const style = Object.fromEntries(
    entries.toSorted(([a], [b]) => a.localeCompare(b)),
  ) as BrandingThemeStyle;
  const usedFontKeys = [
    ...new Set([
      ...Object.values(config.typography),
      ...Object.values(config.blockDefaults).flatMap((defaults) =>
        defaults ? Object.values(defaults.typography).filter((key): key is FontCatalogKey => Boolean(key)) : [],
      ),
    ]),
  ].toSorted() as FontCatalogKey[];

  return { config, style, usedFontKeys, usedFallback };
}
