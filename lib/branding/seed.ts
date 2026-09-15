import type { BlockAppearanceDefaults, BlockDefaults, BlockTypeKey, BrandingConfigV1 } from "@/lib/branding/schema";
import { BLOCK_TYPE_KEYS } from "@/lib/branding/schema";

/**
 * The exact "safe built-in OSI fallback" configuration (plan's Product
 * model, Level 1) — seeded verbatim into both `site_branding` (draft) and
 * `site_branding_publications` (published) by
 * supabase/migrations/0032_site_branding.sql, so the live site is
 * pixel-identical to today the moment this module ships. Values are
 * sourced from `docs/reviews/2026-09-15-branding-phase-0-token-and-font-
 * inventory.md` §4 ("Final OSI fallback configuration"), which is itself
 * the frozen record of every real color/font call site in the current
 * public build.
 *
 * This file (not just the migration's raw jsonb literal) is the source
 * of truth for the seed — `scripts/print-branding-seed.ts` dumps it to
 * JSON for embedding in the migration, and `lib/branding/schema.test.ts`
 * asserts it parses cleanly against `brandingConfigV1Schema`, so the two
 * copies (TS constant vs. migration jsonb) can never silently drift once
 * both are generated from this one object.
 */

// --- Swatches -----------------------------------------------------------
// 12 "brand" swatches (exactly the cap — see Phase 0 §4.1) + a handful of
// "system" swatches (status tones, the fixed focus color, derived
// near-white surfaces) that don't count against that cap.

const swatches: BrandingConfigV1["swatches"] = [
  { id: "osi-navy-900", name: "Primary navy", hex: "#001B33", category: "brand", note: "Primary dark surface / ink on light.", isCustom: false },
  { id: "osi-navy-700", name: "Navy (secondary)", hex: "#04243D", category: "brand", note: "Secondary dark surface, hero scrims.", isCustom: false },
  { id: "osi-navy-600", name: "Navy panel", hex: "#133752", category: "brand", note: "Card/panel surface on navy.", isCustom: false },
  { id: "osi-steel-500", name: "Steel accent", hex: "#234E7B", category: "brand", note: "Structural lines, secondary accent, info tone.", isCustom: false },
  { id: "osi-slate-400", name: "Slate (meta text)", hex: "#4C6880", category: "brand", note: "Meta/caption text.", isCustom: false },
  { id: "osi-slate-300", name: "Slate (muted on light)", hex: "#576979", category: "brand", note: "Muted text on light surfaces.", isCustom: false },
  { id: "osi-slate-200", name: "Slate (muted on dark)", hex: "#818F9B", category: "brand", note: "Muted text on dark surfaces.", isCustom: false },
  { id: "osi-cream-100", name: "Cream surface", hex: "#F2E9DE", category: "brand", note: "Primary light page surface.", isCustom: false },
  { id: "osi-sand-300", name: "Sand accent", hex: "#D0C0A7", category: "brand", note: "Secondary neutral accent.", isCustom: false },
  { id: "osi-gold-500", name: "Signal gold (on dark)", hex: "#E2902A", category: "brand", note: "Accent color — accessible on navy only.", isCustom: false },
  { id: "osi-gold-400", name: "Signal gold (hover, on dark)", hex: "#F0A93D", category: "brand", note: "Hover state for gold-on-dark.", isCustom: false },
  { id: "osi-gold-700", name: "Signal gold (on light)", hex: "#885619", category: "brand", note: "Accent color — accessible on cream only.", isCustom: false },

  { id: "osi-white", name: "White", hex: "#FFFFFF", category: "system", note: "Text on dark surfaces.", isCustom: false },
  { id: "osi-surface-raised", name: "Raised light surface", hex: "#FFFAF4", category: "system", note: "Technical-plate surface background.", isCustom: false },
  { id: "osi-focus-fixed", name: "Focus indicator (fixed)", hex: "#0066FF", category: "system", note: "Universal focus ring — never brand-selectable.", isCustom: false },
  { id: "osi-status-error", name: "Status: error", hex: "#B91C1C", category: "system", note: "Matches StatusMessage's error tone.", isCustom: false },
  { id: "osi-status-success", name: "Status: success", hex: "#047857", category: "system", note: "Matches StatusMessage's success tone.", isCustom: false },
  { id: "osi-status-warning", name: "Status: warning", hex: "#92400E", category: "system", note: "New — no prior warning tone existed; chosen for WCAG AA contrast, see docs/DECISIONS.md.", isCustom: false },
];

// --- Semantic roles -------------------------------------------------------

const roles: BrandingConfigV1["roles"] = {
  primary: { swatchId: "osi-navy-900", opacity: 1 },
  secondary: { swatchId: "osi-navy-700", opacity: 1 },
  accentOnDark: { swatchId: "osi-gold-500", opacity: 1 },
  accentOnLight: { swatchId: "osi-gold-700", opacity: 1 },
  lightSurface: { swatchId: "osi-cream-100", opacity: 1 },
  darkSurface: { swatchId: "osi-navy-900", opacity: 1 },
  textOnLight: { swatchId: "osi-navy-900", opacity: 1 },
  textOnDark: { swatchId: "osi-white", opacity: 1 },
  mutedTextOnLight: { swatchId: "osi-slate-300", opacity: 1 },
  mutedTextOnDark: { swatchId: "osi-slate-200", opacity: 1 },
  // Hairline dividers (`--site-border` / `--site-border-on-dark`) — decorative,
  // not contrast-enforced (see schema.ts's superRefine comment).
  borderOnLight: { swatchId: "osi-navy-900", opacity: 0.16 },
  borderOnDark: { swatchId: "osi-white", opacity: 0.18 },
  focusIndicator: { swatchId: "osi-focus-fixed", opacity: 1 },
  error: { swatchId: "osi-status-error", opacity: 1 },
  success: { swatchId: "osi-status-success", opacity: 1 },
  warning: { swatchId: "osi-status-warning", opacity: 1 },
  info: { swatchId: "osi-steel-500", opacity: 1 },
};

// --- Surface presets --------------------------------------------------

const surfacePresets: BrandingConfigV1["surfacePresets"] = [
  {
    id: "primary-dark",
    name: "Primary dark",
    mode: "solid",
    backgroundSwatchId: "osi-navy-900",
    textSwatchId: "osi-white",
    mutedTextSwatchId: "osi-slate-200",
    accentSwatchId: "osi-gold-500",
    borderSwatchId: "osi-slate-200",
  },
  {
    id: "reading-light",
    name: "Reading light",
    mode: "solid",
    backgroundSwatchId: "osi-cream-100",
    textSwatchId: "osi-navy-900",
    mutedTextSwatchId: "osi-slate-300",
    accentSwatchId: "osi-gold-700",
    borderSwatchId: "osi-slate-300",
  },
  {
    id: "technical-plate",
    name: "Technical plate",
    mode: "solid",
    backgroundSwatchId: "osi-surface-raised",
    textSwatchId: "osi-navy-900",
    mutedTextSwatchId: "osi-slate-300",
    accentSwatchId: "osi-gold-700",
    borderSwatchId: "osi-slate-300",
  },
  {
    id: "transparent-inherit",
    name: "Transparent / inherit",
    mode: "transparent",
    backgroundSwatchId: null,
    textSwatchId: null,
    mutedTextSwatchId: null,
    accentSwatchId: null,
    borderSwatchId: null,
  },
];

// --- Typography ---------------------------------------------------------

const typography: BrandingConfigV1["typography"] = {
  display: "orbitron",
  heading: "montserrat",
  body: "poppins",
  // Interface/label has no distinct current usage (Phase 0 §4.4) — seeded
  // identically to body so the default appearance doesn't change.
  label: "poppins",
};

// --- Block-type defaults --------------------------------------------------

type BlockSeedSpec = {
  surfacePresetId: string | null;
  accentSwatchId: string | null;
  slots: readonly ("display" | "heading" | "body" | "label")[];
};

// One row per registered block type, derived from the Phase 0 inventory's
// per-block appearance table (§3). `slots` picks which typography roles
// this block's defaults carry an explicit font for — every value is the
// same site-wide font already assigned to that role above, so publishing
// this seed changes no pixel of the current site.
const blockSeedSpecs: Record<BlockTypeKey, BlockSeedSpec> = {
  hero_full: { surfacePresetId: "primary-dark", accentSwatchId: "osi-gold-500", slots: ["display", "heading", "body"] },
  hero_page: { surfacePresetId: "reading-light", accentSwatchId: "osi-gold-700", slots: ["heading", "label"] },
  section_heading: { surfacePresetId: "reading-light", accentSwatchId: null, slots: ["heading"] },
  feature_tiles: { surfacePresetId: "reading-light", accentSwatchId: "osi-gold-700", slots: ["heading", "body"] },
  stat_grid: { surfacePresetId: "primary-dark", accentSwatchId: "osi-gold-500", slots: ["display", "label"] },
  mission_cards: { surfacePresetId: "reading-light", accentSwatchId: "osi-gold-700", slots: ["heading"] },
  split_feature: { surfacePresetId: "reading-light", accentSwatchId: "osi-gold-500", slots: ["heading", "body", "label"] },
  link_columns: { surfacePresetId: "reading-light", accentSwatchId: null, slots: ["heading"] },
  global_map: { surfacePresetId: "primary-dark", accentSwatchId: "osi-gold-500", slots: ["heading", "label"] },
  news_feed: { surfacePresetId: "reading-light", accentSwatchId: null, slots: ["heading", "label"] },
  product_grid: { surfacePresetId: "reading-light", accentSwatchId: "osi-gold-700", slots: ["label"] },
  recommendations: { surfacePresetId: "reading-light", accentSwatchId: null, slots: ["heading", "label"] },
  product_hero: { surfacePresetId: "primary-dark", accentSwatchId: "osi-gold-500", slots: ["display", "body", "label"] },
  stages_carousel: { surfacePresetId: "technical-plate", accentSwatchId: "osi-gold-700", slots: ["display", "heading", "body", "label"] },
  how_it_works: { surfacePresetId: "primary-dark", accentSwatchId: null, slots: ["heading", "body"] },
  benefits_cards: { surfacePresetId: "primary-dark", accentSwatchId: null, slots: ["heading", "body"] },
  video_embed: { surfacePresetId: "reading-light", accentSwatchId: null, slots: ["heading"] },
  contact_form: { surfacePresetId: "reading-light", accentSwatchId: "osi-gold-500", slots: ["heading", "label"] },
  contact_details: { surfacePresetId: "reading-light", accentSwatchId: null, slots: ["heading", "label"] },
  cta_band: { surfacePresetId: "primary-dark", accentSwatchId: "osi-gold-500", slots: ["heading"] },
  rich_text: { surfacePresetId: "reading-light", accentSwatchId: "osi-gold-700", slots: ["heading", "body"] },
  accordion: { surfacePresetId: "reading-light", accentSwatchId: null, slots: ["heading", "body"] },
  logo_strip: { surfacePresetId: "reading-light", accentSwatchId: null, slots: ["label"] },
  team_directory: { surfacePresetId: "reading-light", accentSwatchId: null, slots: ["heading", "label"] },
  image_gallery: { surfacePresetId: "reading-light", accentSwatchId: null, slots: ["heading"] },
  spec_table: { surfacePresetId: "reading-light", accentSwatchId: null, slots: ["heading", "body"] },
  image: { surfacePresetId: "transparent-inherit", accentSwatchId: null, slots: [] },
  embed: { surfacePresetId: "transparent-inherit", accentSwatchId: null, slots: [] },
  columns: { surfacePresetId: "reading-light", accentSwatchId: "osi-gold-500", slots: ["heading", "body"] },
  quote_testimonial: { surfacePresetId: "reading-light", accentSwatchId: "osi-gold-700", slots: ["heading", "body"] },
  button_group: { surfacePresetId: "reading-light", accentSwatchId: "osi-gold-500", slots: ["label"] },
  resource_list: { surfacePresetId: "reading-light", accentSwatchId: "osi-gold-700", slots: ["heading", "label"] },
  shared_section: { surfacePresetId: "transparent-inherit", accentSwatchId: null, slots: [] },
  form: { surfacePresetId: "reading-light", accentSwatchId: "osi-gold-500", slots: ["heading", "label"] },
};

function buildBlockDefaults(): BlockDefaults {
  const entries = BLOCK_TYPE_KEYS.map((blockType) => {
    const spec = blockSeedSpecs[blockType];
    const typographyOverrides: BlockAppearanceDefaults["typography"] = {};
    for (const slot of spec.slots) {
      typographyOverrides[slot] = typography[slot];
    }
    const defaults: BlockAppearanceDefaults = {
      surfacePresetId: spec.surfacePresetId,
      accentSwatchId: spec.accentSwatchId,
      typography: typographyOverrides,
    };
    return [blockType, defaults] as const;
  });
  return Object.fromEntries(entries) as BlockDefaults;
}

// --- Primary logo -------------------------------------------------------
// No logo asset exists yet (Phase 0 §4.5) — null defers to the existing
// hardcoded "OSI." text wordmark fallback in header/footer/mega-menu.

const logo: BrandingConfigV1["logo"] = {
  mediaAssetId: null,
  altText: "Odessa Separator Inc.",
  headerSizePreset: "md",
};

export const OSI_SEED_BRANDING_CONFIG: BrandingConfigV1 = {
  configVersion: 1,
  swatches,
  roles,
  surfacePresets,
  typography,
  blockDefaults: buildBlockDefaults(),
  logo,
};
