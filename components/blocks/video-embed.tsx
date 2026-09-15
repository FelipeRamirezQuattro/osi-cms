import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { VideoEmbedRender } from "@/components/blocks/video-embed-client";
import { optionalSafeHrefSchema } from "@/lib/validation/common";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

const schema = blockCommonSchema.extend({
  title: z.string().optional(),
  // Falls straight into an <iframe src> when it isn't recognized as a
  // YouTube/Vimeo URL (see toEmbedUrl in video-embed-client.tsx) — the
  // same safety net as any other embed/link field. Optional (not
  // required) rather than a hard-required `safeHrefSchema()`: there's no
  // legitimate, non-invented URL to fall back to the way cta-band's
  // ctaHref can fall back to a real page like "/contact" — unlike a CTA
  // link, "some real video, any real video" doesn't exist. A freshly
  // added Video Embed block with no URL yet renders nothing (see
  // VideoEmbedRender's early return) rather than either fabricating a
  // placeholder URL or failing to save at all.
  videoUrl: optionalSafeHrefSchema({ label: "Video URL" }),
  posterImageUrl: z.string().optional(),
});

export type VideoEmbedData = z.infer<typeof schema>;

const adminFields: FieldSpec[] = [
  { key: "title", label: "Title", type: "text", optional: true },
  { key: "videoUrl", label: "Video URL", type: "text", optional: true },
  { key: "posterImageUrl", label: "Poster image", type: "image", optional: true },
];

export const videoEmbedBlock = defineBlock({
  type: "video_embed",
  label: "Video embed",
  category: "media",
  description: "Click-to-play YouTube/Vimeo video behind a poster image — use for a single featured video; for a generic iframe embed (maps, other providers) use the Embed block instead.",
  schema,
  adminFields,
  defaults: { background: "cream", spacingTop: "md", spacingBottom: "md", videoUrl: null },
  Render: VideoEmbedRender,
});
