import { z } from "zod";

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

// Every block accepts these (master prompt, block registry intro):
// "an optional anchorId, a background variant... and top/bottom spacing."
export const blockCommonSchema = z.object({
  anchorId: z.string().optional(),
  background: z.enum(["navy", "cream", "transparent"]).default("cream"),
  spacingTop: z.enum(["sm", "md", "lg"]).default("md"),
  spacingBottom: z.enum(["sm", "md", "lg"]).default("md"),
});

export type BlockCommon = z.infer<typeof blockCommonSchema>;
