import { z } from "zod";
import {
  FONT_CATALOG_KEYS,
  TYPOGRAPHY_SLOTS,
  getFontCatalogEntry,
  type TypographySlot,
} from "@/lib/fonts/catalog";

export {
  FONT_CATALOG,
  TYPOGRAPHY_SLOTS,
  getFontCatalogEntry,
  type FontCatalogKey,
  type TypographySlot,
} from "@/lib/fonts/catalog";

/**
 * This is the version-aware Zod schema for `site_branding.config` /
 * `site_branding_publications.config` / `site_branding_revisions.config`
 * (all `jsonb`, see supabase/migrations/0032_site_branding.sql). Every
 * read of one of those columns MUST go through `parseBrandingConfig`
 * (or `brandingConfigSchema.parse`) — never cast the raw jsonb directly
 * to a trusted type (plan's "Configuration schema versioning" rule).
 *
 * File location: chosen as `lib/branding/schema.ts` (a new domain
 * directory, mirroring `lib/auth/`, `lib/blocks/`) rather than
 * `lib/blocks/branding-schema.ts`, since this schema is about site-wide
 * brand configuration, not a block definition itself — `lib/blocks/*`
 * only imports the pieces it needs from here (BLOCK_TYPE_KEYS et al).
 */

// ---------------------------------------------------------------------
// Registered block types
// ---------------------------------------------------------------------

/**
 * The 34 block types currently registered in `lib/blocks/registry.ts`
 * (confirmed against `docs/reviews/2026-09-15-branding-phase-0-token-
 * and-font-inventory.md` §3's inventory). Hardcoded here rather than
 * imported from the registry itself so this validation module stays
 * lean (the registry transitively imports every block component file,
 * many of them React components) — `lib/branding/schema.test.ts` has a
 * regression test importing `blockRegistry` and asserting this list
 * stays byte-for-byte in sync, so drift is caught immediately rather
 * than silently accepted.
 */
export const BLOCK_TYPE_KEYS = [
  "hero_full",
  "hero_page",
  "section_heading",
  "feature_tiles",
  "stat_grid",
  "mission_cards",
  "split_feature",
  "link_columns",
  "global_map",
  "news_feed",
  "product_grid",
  "recommendations",
  "product_hero",
  "stages_carousel",
  "how_it_works",
  "benefits_cards",
  "video_embed",
  "contact_form",
  "newsletter_signup",
  "contact_details",
  "cta_band",
  "rich_text",
  "accordion",
  "logo_strip",
  "team_directory",
  "image_gallery",
  "spec_table",
  "image",
  "embed",
  "columns",
  "quote_testimonial",
  "button_group",
  "resource_list",
  "shared_section",
  "form",
] as const;

export type BlockTypeKey = (typeof BLOCK_TYPE_KEYS)[number];

// ---------------------------------------------------------------------
// Font catalog
// ---------------------------------------------------------------------
// Color primitives + WCAG contrast math (pure — no external dependency)
// ---------------------------------------------------------------------

/** Opaque `#RRGGBB` only — no alpha, no CSS functions, no short (#RGB) form. */
export const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/;

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const match = HEX_COLOR_PATTERN.exec(hex);
  if (!match) throw new Error(`Invalid opaque hex color: ${hex}`);
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function srgbChannelToLinear(channel8bit: number): number {
  const c = channel8bit / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance (https://www.w3.org/TR/WCAG21/#dfn-relative-luminance). */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * srgbChannelToLinear(r) + 0.7152 * srgbChannelToLinear(g) + 0.0722 * srgbChannelToLinear(b);
}

/** WCAG contrast ratio between two opaque colors, always >= 1. */
export function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexA);
  const lB = relativeLuminance(hexB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Alpha-composites `fgHex` at `alpha` (0-1) over the opaque `bgHex`, returning an opaque hex. */
export function compositeOverBackground(fgHex: string, alpha: number, bgHex: string): string {
  const fg = hexToRgb(fgHex);
  const bg = hexToRgb(bgHex);
  const mix = (a: number, b: number) => Math.round(alpha * a + (1 - alpha) * b);
  const toHex = (n: number) => n.toString(16).padStart(2, "0").toUpperCase();
  return `#${toHex(mix(fg.r, bg.r))}${toHex(mix(fg.g, bg.g))}${toHex(mix(fg.b, bg.b))}`;
}

const WCAG_AA_NORMAL_TEXT = 4.5;
const WCAG_AA_NON_TEXT = 3;

// ---------------------------------------------------------------------
// Swatches
// ---------------------------------------------------------------------

const SWATCH_ID_PATTERN = /^[a-z][a-z0-9-]{0,39}$/;

/**
 * `category: "system"` swatches (status tones, the fixed focus color, the
 * derived pure-white/near-white surfaces) don't count against the
 * 12-swatch active-palette cap — the cap exists to keep the admin's
 * *brand* color picker usable (plan's Swatches rules), not to limit
 * system semantics that were never a creative choice.
 */
export const swatchSchema = z.object({
  id: z.string().regex(SWATCH_ID_PATTERN, "Swatch ID must be a stable lowercase-kebab identifier"),
  name: z.string().trim().min(1, "Swatch name is required").max(60),
  hex: z
    .string()
    .transform((v) => v.trim().toUpperCase())
    .pipe(z.string().regex(HEX_COLOR_PATTERN, "Color must be an opaque #RRGGBB hex value (no alpha, no CSS functions, no URLs)")),
  category: z.enum(["brand", "system"]).default("brand"),
  note: z.string().trim().max(200).nullable().default(null),
  isCustom: z.boolean().default(false),
});

export type Swatch = z.infer<typeof swatchSchema>;

const MAX_ACTIVE_BRAND_SWATCHES = 12;

// ---------------------------------------------------------------------
// Semantic color roles
// ---------------------------------------------------------------------

/** A reference to a swatch, with optional opacity for derived/translucent uses (e.g. hairline borders). */
export const roleColorRefSchema = z.object({
  swatchId: z.string().min(1, "A swatch reference is required"),
  /** 0-1. Only meaningful for border roles; omitted/1 means fully opaque. */
  opacity: z.number().min(0).max(1).default(1),
});

export type RoleColorRef = z.infer<typeof roleColorRefSchema>;

/**
 * Stable roles consumed by the public design system — component
 * code consumes roles, never OSI-specific swatch names (plan's Semantic
 * color roles section). Accent is split into on-dark/on-light variants
 * because CLAUDE.md's Hardening section documents that the mockup's gold
 * accent only clears WCAG AA on one background each (gold-500 on navy,
 * gold-700 on cream) — a single "Accent" role could never be both.
 */
export const semanticRolesSchema = z.object({
  primary: roleColorRefSchema,
  secondary: roleColorRefSchema,
  accentOnDark: roleColorRefSchema,
  accentOnLight: roleColorRefSchema,
  lightSurface: roleColorRefSchema,
  darkSurface: roleColorRefSchema,
  textOnLight: roleColorRefSchema,
  textOnDark: roleColorRefSchema,
  mutedTextOnLight: roleColorRefSchema,
  mutedTextOnDark: roleColorRefSchema,
  borderOnLight: roleColorRefSchema,
  borderOnDark: roleColorRefSchema,
  /**
   * Intentionally fixed (CLAUDE.md Hardening section / Phase 0 inventory
   * §2.1): neither navy nor gold clears 3:1 against both navy and cream
   * simultaneously, so this role must always resolve to the universal
   * #0066FF focus ring — enforced in `brandingConfigV1Schema`'s
   * superRefine below, not just documented.
   */
  focusIndicator: roleColorRefSchema,
  error: roleColorRefSchema,
  success: roleColorRefSchema,
  warning: roleColorRefSchema,
  info: roleColorRefSchema,
});

export type SemanticRoles = z.infer<typeof semanticRolesSchema>;

export const FIXED_FOCUS_INDICATOR_HEX = "#0066FF";

// ---------------------------------------------------------------------
// Surface presets
// ---------------------------------------------------------------------

const SURFACE_PRESET_ID_PATTERN = /^[a-z][a-z0-9-]{0,39}$/;

export const surfacePresetSchema = z
  .object({
    id: z.string().regex(SURFACE_PRESET_ID_PATTERN, "Surface preset ID must be a stable lowercase-kebab identifier"),
    name: z.string().trim().min(1, "Surface preset name is required").max(60),
    mode: z.enum(["solid", "transparent"]),
    backgroundSwatchId: z.string().nullable(),
    textSwatchId: z.string().nullable(),
    mutedTextSwatchId: z.string().nullable(),
    accentSwatchId: z.string().nullable(),
    borderSwatchId: z.string().nullable(),
  })
  .superRefine((preset, ctx) => {
    if (preset.mode === "transparent") return;
    // "solid" presets are real, renderable combinations — every slot must
    // be populated so a contrast check (done at the parent schema level,
    // where the swatch hex lookup table is available) is possible.
    for (const field of ["backgroundSwatchId", "textSwatchId", "mutedTextSwatchId", "accentSwatchId", "borderSwatchId"] as const) {
      if (preset[field] === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Surface preset "${preset.id}" is solid but is missing ${field}`,
          path: [field],
        });
      }
    }
  });

export type SurfacePreset = z.infer<typeof surfacePresetSchema>;

// ---------------------------------------------------------------------
// Typography role assignments
// ---------------------------------------------------------------------

export const typographyRoleAssignmentsSchema = z.object({
  display: z.enum(FONT_CATALOG_KEYS),
  heading: z.enum(FONT_CATALOG_KEYS),
  body: z.enum(FONT_CATALOG_KEYS),
  label: z.enum(FONT_CATALOG_KEYS),
});

export type TypographyRoleAssignments = z.infer<typeof typographyRoleAssignmentsSchema>;

function checkTypographyAssignment(
  slot: TypographySlot,
  fontKey: string,
  ctx: z.RefinementCtx,
  path: (string | number)[],
) {
  const entry = getFontCatalogEntry(fontKey);
  if (!entry) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Unknown font catalog key: ${fontKey}`, path });
    return;
  }
  if (entry.status !== "available") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Font "${fontKey}" is not available for new selections`, path });
  }
  if (!(entry.allowedRoles as readonly string[]).includes(slot)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Font "${fontKey}" is not permitted for the "${slot}" typography role`,
      path,
    });
  }
}

// ---------------------------------------------------------------------
// Block-type appearance defaults (Level 2 of the inheritance cascade)
// ---------------------------------------------------------------------

export const blockAppearanceDefaultsSchema = z.object({
  /** null = inherit the transparent/ambient surface (matches "Use block default" semantics one level up). */
  surfacePresetId: z.string().nullable(),
  accentSwatchId: z.string().nullable().default(null),
  typography: z
    .object({
      display: z.enum(FONT_CATALOG_KEYS).optional(),
      heading: z.enum(FONT_CATALOG_KEYS).optional(),
      body: z.enum(FONT_CATALOG_KEYS).optional(),
      label: z.enum(FONT_CATALOG_KEYS).optional(),
    })
    .default({}),
});

export type BlockAppearanceDefaults = z.infer<typeof blockAppearanceDefaultsSchema>;

/**
 * Every key is drawn from the current registry's 34 block types, and
 * `.strict()` rejects any key outside that set (an unrecognized/typo'd
 * block type) — this is what backs the test matrix's "invalid block key"
 * case. Each key is `.optional()`, NOT required: a missing key means
 * "this block type inherits the site-wide/global defaults" (Level 1 of
 * the cascade), not an error. This matters because the block registry
 * has already grown once (26 -> 34 block types, per the Phase 0
 * inventory doc) and will again — a required-key shape would mean every
 * previously-saved draft/publication/revision stops parsing the moment a
 * new block type is registered, which is exactly the "never a broken
 * public page" failure the plan's block-inheritance rules forbid
 * ("Unknown/deleted token or font references fall back deterministically
 * ... never a broken public page"). `.strict()` is kept specifically so
 * the "invalid block key" test still means something once keys are
 * optional — without it, an unrecognized key would just be silently
 * accepted as extra data instead of rejected.
 */
export const blockDefaultsSchema = z
  .object(
    Object.fromEntries(BLOCK_TYPE_KEYS.map((key) => [key, blockAppearanceDefaultsSchema.optional()])) as Record<
      BlockTypeKey,
      z.ZodOptional<typeof blockAppearanceDefaultsSchema>
    >,
  )
  .strict();

export type BlockDefaults = Partial<Record<BlockTypeKey, BlockAppearanceDefaults>>;

// ---------------------------------------------------------------------
// Primary logo
// ---------------------------------------------------------------------

export const HEADER_LOGO_SIZE_PRESETS = ["sm", "md", "lg"] as const;

export const primaryLogoSchema = z.object({
  /** A media_assets.id — shape-only here (constraint: no DB row-existence check at the Zod layer). */
  mediaAssetId: z.string().uuid().nullable(),
  altText: z
    .string()
    .trim()
    .min(1, "Logo alt text is required")
    .max(120)
    .refine((value) => value.toLowerCase() !== "logo", {
      message: 'Alt text must be a meaningful brand name, not the word "logo" alone',
    }),
  headerSizePreset: z.enum(HEADER_LOGO_SIZE_PRESETS),
});

export type PrimaryLogo = z.infer<typeof primaryLogoSchema>;

// ---------------------------------------------------------------------
// Top-level versioned configuration
// ---------------------------------------------------------------------

export const BRANDING_CONFIG_VERSION_LATEST = 1 as const;

/**
 * v1 of the branding configuration schema. `configVersion` is a Zod
 * literal so `brandingConfigSchema` below (a discriminated union) can
 * dispatch on it — an unsupported version number (or a missing one)
 * fails to match any union member, surfacing as "bad schema version"
 * (test matrix requirement) rather than silently coercing.
 */
export const brandingConfigV1Schema = z
  .object({
    configVersion: z.literal(1),
    swatches: z.array(swatchSchema),
    roles: semanticRolesSchema,
    surfacePresets: z.array(surfacePresetSchema),
    typography: typographyRoleAssignmentsSchema,
    blockDefaults: blockDefaultsSchema,
    logo: primaryLogoSchema,
  })
  .superRefine((config, ctx) => {
    // --- Swatches: unique IDs/names, active-brand-palette cap ---
    const idSeen = new Set<string>();
    const nameSeen = new Set<string>();
    const swatchById = new Map<string, Swatch>();
    let brandSwatchCount = 0;
    config.swatches.forEach((swatch, index) => {
      if (idSeen.has(swatch.id)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate swatch ID: ${swatch.id}`, path: ["swatches", index, "id"] });
      }
      idSeen.add(swatch.id);
      if (nameSeen.has(swatch.name)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate swatch name: ${swatch.name}`, path: ["swatches", index, "name"] });
      }
      nameSeen.add(swatch.name);
      swatchById.set(swatch.id, swatch);
      if (swatch.category === "brand") brandSwatchCount += 1;
    });
    if (brandSwatchCount > MAX_ACTIVE_BRAND_SWATCHES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Active brand palette has ${brandSwatchCount} swatches; the cap is ${MAX_ACTIVE_BRAND_SWATCHES}`,
        path: ["swatches"],
      });
    }

    const resolveHex = (swatchId: string, path: (string | number)[]): string | null => {
      const swatch = swatchById.get(swatchId);
      if (!swatch) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Unknown swatch reference: ${swatchId}`, path });
        return null;
      }
      // The swatch's own `hex` field already ran through HEX_COLOR_PATTERN
      // at the field level — if it failed there, that issue is already
      // recorded. Don't also feed a malformed value into the contrast math
      // below (relativeLuminance/hexToRgb throw a plain Error, not a
      // ZodIssue, on anything that isn't opaque #RRGGBB), just skip it here.
      if (!HEX_COLOR_PATTERN.test(swatch.hex)) return null;
      return swatch.hex;
    };

    // --- Semantic roles: reference integrity, fixed focus color, AA text contrast ---
    const roleEntries = Object.entries(config.roles) as [keyof SemanticRoles, RoleColorRef][];
    const roleHex = new Map<keyof SemanticRoles, string>();
    for (const [roleName, ref] of roleEntries) {
      const hex = resolveHex(ref.swatchId, ["roles", roleName, "swatchId"]);
      if (hex) roleHex.set(roleName, hex);
    }

    const focusHex = roleHex.get("focusIndicator");
    if (focusHex && focusHex !== FIXED_FOCUS_INDICATOR_HEX) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Focus indicator must resolve to the fixed accessible color ${FIXED_FOCUS_INDICATOR_HEX}, not a brand-selectable one`,
        path: ["roles", "focusIndicator"],
      });
    }

    const lightBg = roleHex.get("lightSurface");
    const darkBg = roleHex.get("darkSurface");
    const checkTextContrast = (roleName: keyof SemanticRoles, bg: string | undefined) => {
      const fg = roleHex.get(roleName);
      if (!fg || !bg) return;
      const ratio = contrastRatio(fg, bg);
      if (ratio < WCAG_AA_NORMAL_TEXT) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `"${roleName}" only reaches ${ratio.toFixed(2)}:1 contrast against its surface; WCAG AA requires ${WCAG_AA_NORMAL_TEXT}:1`,
          path: ["roles", roleName],
        });
      }
    };
    checkTextContrast("textOnLight", lightBg);
    checkTextContrast("mutedTextOnLight", lightBg);
    checkTextContrast("textOnDark", darkBg);
    checkTextContrast("mutedTextOnDark", darkBg);
    // Status tones (error/success/warning/info) render as ordinary text on
    // a light surface today (StatusMessage's bg-*-50 treatments) — checked
    // against lightSurface for the same reason textOnLight/mutedTextOnLight
    // are: a status message IS body text, not a decorative accent. This is
    // what catches a seed value like a too-light "warning" amber failing
    // AA on cream before it ever ships (a real bug an earlier version of
    // this seed had — see docs/DECISIONS.md).
    checkTextContrast("error", lightBg);
    checkTextContrast("success", lightBg);
    checkTextContrast("warning", lightBg);
    checkTextContrast("info", lightBg);
    // borderOnLight/borderOnDark are deliberately NOT contrast-checked here:
    // they model the existing translucent hairline dividers (Phase 0
    // inventory §2.3 classifies `--site-border`/`--site-border-on-dark` as
    // structural/derived, not an AA-critical text/background pair), and a
    // low-opacity decorative divider legitimately fails a 3:1 non-text
    // check by design. Essential (solid) border/accent contrast is
    // enforced below, at the surface-preset level, where a border is a
    // real opaque UI-component boundary rather than a decorative overlay.

    // --- Surface presets: unique IDs/names, reference integrity, AA contrast ---
    const presetIdSeen = new Set<string>();
    const presetNameSeen = new Set<string>();
    const presetIds = new Set<string>();
    config.surfacePresets.forEach((preset, index) => {
      if (presetIdSeen.has(preset.id)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate surface preset ID: ${preset.id}`, path: ["surfacePresets", index, "id"] });
      }
      presetIdSeen.add(preset.id);
      presetIds.add(preset.id);
      if (presetNameSeen.has(preset.name)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate surface preset name: ${preset.name}`, path: ["surfacePresets", index, "name"] });
      }
      presetNameSeen.add(preset.name);

      if (preset.mode !== "solid") return;
      const bg = preset.backgroundSwatchId ? resolveHex(preset.backgroundSwatchId, ["surfacePresets", index, "backgroundSwatchId"]) : null;
      const text = preset.textSwatchId ? resolveHex(preset.textSwatchId, ["surfacePresets", index, "textSwatchId"]) : null;
      const muted = preset.mutedTextSwatchId ? resolveHex(preset.mutedTextSwatchId, ["surfacePresets", index, "mutedTextSwatchId"]) : null;
      const accent = preset.accentSwatchId ? resolveHex(preset.accentSwatchId, ["surfacePresets", index, "accentSwatchId"]) : null;
      const border = preset.borderSwatchId ? resolveHex(preset.borderSwatchId, ["surfacePresets", index, "borderSwatchId"]) : null;
      if (!bg) return;

      const requireRatio = (label: string, fg: string | null, min: number, path: (string | number)[]) => {
        if (!fg) return;
        const ratio = contrastRatio(fg, bg);
        if (ratio < min) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Surface preset "${preset.id}" ${label} only reaches ${ratio.toFixed(2)}:1 against its background; requires ${min}:1`,
            path,
          });
        }
      };
      requireRatio("text", text, WCAG_AA_NORMAL_TEXT, ["surfacePresets", index, "textSwatchId"]);
      requireRatio("muted text", muted, WCAG_AA_NORMAL_TEXT, ["surfacePresets", index, "mutedTextSwatchId"]);
      requireRatio("accent", accent, WCAG_AA_NON_TEXT, ["surfacePresets", index, "accentSwatchId"]);
      requireRatio("border", border, WCAG_AA_NON_TEXT, ["surfacePresets", index, "borderSwatchId"]);
    });

    // --- Typography: site-wide role assignments ---
    for (const slot of TYPOGRAPHY_SLOTS) {
      checkTypographyAssignment(slot, config.typography[slot], ctx, ["typography", slot]);
    }

    // --- Block-type defaults: preset/swatch references + per-slot font validity ---
    for (const blockType of BLOCK_TYPE_KEYS) {
      const defaults = config.blockDefaults[blockType];
      // A missing entry means "inherit the site-wide/global defaults" —
      // nothing to validate for this block type (see blockDefaultsSchema's
      // top comment for why keys are optional).
      if (!defaults) continue;
      if (defaults.surfacePresetId !== null && !presetIds.has(defaults.surfacePresetId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Block "${blockType}" references unknown surface preset: ${defaults.surfacePresetId}`,
          path: ["blockDefaults", blockType, "surfacePresetId"],
        });
      }
      if (defaults.accentSwatchId !== null && !swatchById.has(defaults.accentSwatchId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Block "${blockType}" references unknown accent swatch: ${defaults.accentSwatchId}`,
          path: ["blockDefaults", blockType, "accentSwatchId"],
        });
      }
      for (const slot of TYPOGRAPHY_SLOTS) {
        const fontKey = defaults.typography[slot];
        if (fontKey) checkTypographyAssignment(slot, fontKey, ctx, ["blockDefaults", blockType, "typography", slot]);
      }
    }
  });

export type BrandingConfigV1 = z.infer<typeof brandingConfigV1Schema>;

/**
 * Versioned wrapper. Today there is only one version, so this union has
 * one member — but it is a real discriminated union (not just an alias
 * for `brandingConfigV1Schema`) so a future v2 plugs in as
 * `z.discriminatedUnion("configVersion", [brandingConfigV1Schema, brandingConfigV2Schema])`
 * without disturbing this file's exported names or `parseBrandingConfig`'s
 * signature.
 */
export const brandingConfigSchema = z.discriminatedUnion("configVersion", [brandingConfigV1Schema]);

export type BrandingConfig = z.infer<typeof brandingConfigSchema>;

/**
 * The one required "deterministic upgrade function between versions"
 * (plan's Configuration schema versioning rule) — today an identity
 * transform since v1 is the only version. When a v2 is introduced, this
 * becomes the dispatcher: parse the raw input against whichever version
 * schema matches its `configVersion`, then chain that version's own
 * upgrade step (e.g. `upgradeV1ToV2`) up to `BRANDING_CONFIG_VERSION_LATEST`.
 * Never skip a step — each version's upgrade function must be able to
 * assume its input already satisfies the *previous* version's schema.
 */
export function upgradeBrandingConfigToLatest(config: BrandingConfigV1): BrandingConfigV1 {
  return config;
}

/**
 * The single sanctioned entry point for turning a `jsonb` column's raw
 * value into a trusted `BrandingConfig` — every caller in
 * `lib/data/branding.ts` must go through this (or `.safeParse` on
 * `brandingConfigSchema` directly when a non-throwing result is needed),
 * never `as BrandingConfig`.
 */
export function parseBrandingConfig(raw: unknown): BrandingConfig {
  return brandingConfigSchema.parse(raw);
}

export function safeParseBrandingConfig(raw: unknown): z.ZodSafeParseResult<BrandingConfig> {
  return brandingConfigSchema.safeParse(raw);
}
