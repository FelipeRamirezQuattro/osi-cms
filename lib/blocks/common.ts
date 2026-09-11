import { z } from "zod";

export type BlockBackground = "navy" | "cream" | "image" | "transparent";
export type BlockSpacingSide = "sm" | "md" | "lg";

// Every block accepts these (master prompt, block registry intro):
// "an optional anchorId, a background variant... and top/bottom spacing."
export const blockCommonSchema = z.object({
  anchorId: z.string().optional(),
  background: z.enum(["navy", "cream", "image", "transparent"]).default("cream"),
  spacingTop: z.enum(["sm", "md", "lg"]).default("md"),
  spacingBottom: z.enum(["sm", "md", "lg"]).default("md"),
});

export type BlockCommon = z.infer<typeof blockCommonSchema>;
