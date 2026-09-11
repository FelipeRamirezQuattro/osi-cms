import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { VideoEmbedRender } from "@/components/blocks/video-embed-client";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

const schema = blockCommonSchema.extend({
  title: z.string().optional(),
  videoUrl: z.string(),
  posterImageUrl: z.string().optional(),
});

export type VideoEmbedData = z.infer<typeof schema>;

const adminFields: FieldSpec[] = [
  { key: "title", label: "Title", type: "text", optional: true },
  { key: "videoUrl", label: "Video URL", type: "text" },
  { key: "posterImageUrl", label: "Poster image", type: "image", optional: true },
];

export const videoEmbedBlock = defineBlock({
  type: "video_embed",
  label: "Video embed",
  category: "media",
  schema,
  adminFields,
  defaults: { background: "cream", spacingTop: "md", spacingBottom: "md", videoUrl: "" },
  Render: VideoEmbedRender,
});
