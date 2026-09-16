import type { BlockAppearanceCapabilities } from "@/lib/blocks/types";
import type { BlockTypeKey } from "@/lib/branding/schema";

/**
 * Runtime backstop for a block type that's momentarily missing from the map
 * below (a block added to the registry but not yet given a capability entry
 * here) — a schema.test.ts parity assertion already catches this at the code
 * level, but the public renderer should never 500 a page over it either;
 * "no controls exposed" is the safe default until the entry is added.
 */
export const DEFAULT_CAPABILITIES: BlockAppearanceCapabilities = {
  surface: false,
  accent: false,
  typography: [],
};

/**
 * Code-owned capability contract. Keeping this exhaustive and separate from
 * renderers makes the client-safe palette serializable and gives a single
 * review surface whenever a block type is added.
 */
export const BLOCK_APPEARANCE_CAPABILITIES = {
  hero_full: { surface: true, accent: true, typography: ["display", "heading", "body"] },
  hero_page: { surface: true, accent: true, typography: ["heading", "label"] },
  section_heading: { surface: true, accent: false, typography: ["heading"] },
  feature_tiles: { surface: true, accent: true, typography: ["heading", "body"] },
  stat_grid: { surface: true, accent: true, typography: ["display", "label"] },
  mission_cards: { surface: true, accent: true, typography: ["heading"] },
  split_feature: { surface: true, accent: true, typography: ["heading", "body", "label"] },
  link_columns: { surface: true, accent: false, typography: ["heading"] },
  global_map: { surface: true, accent: true, typography: ["heading", "label"] },
  news_feed: { surface: true, accent: false, typography: ["heading", "label"] },
  product_grid: { surface: true, accent: true, typography: ["label"] },
  recommendations: { surface: true, accent: false, typography: ["heading", "label"] },
  product_hero: { surface: true, accent: true, typography: ["display", "body", "label"] },
  stages_carousel: { surface: true, accent: true, typography: ["display", "heading", "body", "label"] },
  how_it_works: { surface: true, accent: false, typography: ["heading", "body"] },
  benefits_cards: { surface: true, accent: false, typography: ["heading", "body"] },
  video_embed: { surface: true, accent: false, typography: ["heading"] },
  contact_form: { surface: true, accent: true, typography: ["heading", "label"] },
  contact_details: { surface: true, accent: false, typography: ["heading", "label"] },
  cta_band: { surface: true, accent: true, typography: ["heading"] },
  rich_text: { surface: true, accent: true, typography: ["heading", "body"] },
  accordion: { surface: true, accent: false, typography: ["heading", "body"] },
  logo_strip: { surface: true, accent: false, typography: ["label"] },
  team_directory: { surface: true, accent: false, typography: ["heading", "label"] },
  image_gallery: { surface: true, accent: false, typography: ["heading"] },
  spec_table: { surface: true, accent: false, typography: ["heading", "body"] },
  image: { surface: true, accent: false, typography: [] },
  embed: { surface: true, accent: false, typography: [] },
  columns: { surface: true, accent: true, typography: ["heading", "body"] },
  quote_testimonial: { surface: true, accent: true, typography: ["heading", "body"] },
  button_group: { surface: true, accent: true, typography: ["label"] },
  resource_list: { surface: true, accent: true, typography: ["heading", "label"] },
  shared_section: { surface: true, accent: false, typography: [] },
  form: { surface: true, accent: true, typography: ["heading", "label"] },
} as const satisfies Record<BlockTypeKey, BlockAppearanceCapabilities>;
