import { z } from "zod";
import { FONT_CATALOG_KEYS } from "@/lib/fonts/catalog";

// "image" was removed (Task 7 item #9) — components/ui/section.tsx
// rendered it identically to "transparent" (both `bg-transparent`; see
// its own comment), so it was a fully dead option. A real configurable
// background-image system (overlay, focal point, accessible decorative
// semantics) is disproportionate new scope for a dead-field fix and
// cuts against this project's design system (navy/cream/gold + the six
// documented motifs, not generic photo backgrounds) — see
// docs/DECISIONS.md.
export type BlockBackground = "navy" | "cream" | "transparent";
export type BlockSpacingSide = "sm" | "md" | "lg";

const APPEARANCE_ID_PATTERN = /^[a-z][a-z0-9-]{0,39}$/;

/**
 * Level-3 appearance overrides stored with a block. An empty object means
 * "inherit the block-type defaults". The whole property remains optional so
 * blocks saved before branding existed can be recognized and interpreted via
 * their legacy `background` value without a data migration.
 */
export const blockAppearanceSchema = z.object({
  surfacePresetId: z.string().regex(APPEARANCE_ID_PATTERN).nullable().optional(),
  accentSwatchId: z.string().regex(APPEARANCE_ID_PATTERN).nullable().optional(),
  typography: z
    .object({
      display: z.enum(FONT_CATALOG_KEYS).nullable().optional(),
      heading: z.enum(FONT_CATALOG_KEYS).nullable().optional(),
      body: z.enum(FONT_CATALOG_KEYS).nullable().optional(),
      label: z.enum(FONT_CATALOG_KEYS).nullable().optional(),
    })
    .strict()
    .optional(),
}).strict();

export type BlockAppearance = z.infer<typeof blockAppearanceSchema>;

// Every block accepts these (master prompt, block registry intro):
// "an optional anchorId, a background variant... and top/bottom spacing."
export const blockCommonSchema = z.object({
  anchorId: z.string().optional(),
  background: z.enum(["navy", "cream", "transparent"]).default("cream"),
  spacingTop: z.enum(["sm", "md", "lg"]).default("md"),
  spacingBottom: z.enum(["sm", "md", "lg"]).default("md"),
  appearance: blockAppearanceSchema.optional(),
});

export type BlockCommon = z.infer<typeof blockCommonSchema>;
