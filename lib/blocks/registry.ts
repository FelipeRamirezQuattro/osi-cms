import type { BlockDefinition } from "@/lib/blocks/types";
import { heroFullBlock } from "@/components/blocks/hero-full";
import { heroPageBlock } from "@/components/blocks/hero-page";
import { sectionHeadingBlock } from "@/components/blocks/section-heading";
import { featureTilesBlock } from "@/components/blocks/feature-tiles";
import { statGridBlock } from "@/components/blocks/stat-grid";
import { missionCardsBlock } from "@/components/blocks/mission-cards";
import { splitFeatureBlock } from "@/components/blocks/split-feature";
import { linkColumnsBlock } from "@/components/blocks/link-columns";
import { globalMapBlock } from "@/components/blocks/global-map";
import { newsFeedBlock } from "@/components/blocks/news-feed";
import { productGridBlock } from "@/components/blocks/product-grid";
import { recommendationsBlock } from "@/components/blocks/recommendations";
import { productHeroBlock } from "@/components/blocks/product-hero";
import { stagesCarouselBlock } from "@/components/blocks/stages-carousel";
import { howItWorksBlock } from "@/components/blocks/how-it-works";
import { benefitsCardsBlock } from "@/components/blocks/benefits-cards";
import { videoEmbedBlock } from "@/components/blocks/video-embed";
import { contactFormBlock } from "@/components/blocks/contact-form";
import { contactDetailsBlock } from "@/components/blocks/contact-details";
import { ctaBandBlock } from "@/components/blocks/cta-band";
import { richTextBlock } from "@/components/blocks/rich-text";
import { accordionBlock } from "@/components/blocks/accordion";
import { logoStripBlock } from "@/components/blocks/logo-strip";
import { teamDirectoryBlock } from "@/components/blocks/team-directory";
import { imageGalleryBlock } from "@/components/blocks/image-gallery";
import { specTableBlock } from "@/components/blocks/spec-table";

/**
 * The block registry (see CLAUDE.md / master prompt §6). Adding a block
 * later = one file in components/blocks/ + one entry here, nothing else.
 */
export const blockRegistry: Record<string, BlockDefinition<unknown>> = {
  hero_full: heroFullBlock,
  hero_page: heroPageBlock,
  section_heading: sectionHeadingBlock,
  feature_tiles: featureTilesBlock,
  stat_grid: statGridBlock,
  mission_cards: missionCardsBlock,
  split_feature: splitFeatureBlock,
  link_columns: linkColumnsBlock,
  global_map: globalMapBlock,
  news_feed: newsFeedBlock,
  product_grid: productGridBlock,
  recommendations: recommendationsBlock,
  product_hero: productHeroBlock,
  stages_carousel: stagesCarouselBlock,
  how_it_works: howItWorksBlock,
  benefits_cards: benefitsCardsBlock,
  video_embed: videoEmbedBlock,
  contact_form: contactFormBlock,
  contact_details: contactDetailsBlock,
  cta_band: ctaBandBlock,
  rich_text: richTextBlock,
  accordion: accordionBlock,
  logo_strip: logoStripBlock,
  team_directory: teamDirectoryBlock,
  image_gallery: imageGalleryBlock,
  spec_table: specTableBlock,
};

export function getBlockDefinition(type: string): BlockDefinition<unknown> | undefined {
  return blockRegistry[type];
}

// Client-safe summary for the admin block palette — BlockDefinition itself
// carries a ZodType and a Render component, neither serializable across
// the server/client boundary.
export type BlockPaletteEntry = {
  type: string;
  label: string;
  category: BlockDefinition<unknown>["category"];
  adminFields: BlockDefinition<unknown>["adminFields"];
  defaults: unknown;
};

export function getBlockPalette(): BlockPaletteEntry[] {
  return Object.values(blockRegistry)
    .map((def) => ({ type: def.type, label: def.label, category: def.category, adminFields: def.adminFields, defaults: def.defaults }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
