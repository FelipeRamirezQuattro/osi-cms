import Image from "next/image";
import { z } from "zod";
import { resolveMediaUrl } from "@/lib/media";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { VideoPlayer } from "@/components/blocks/video-embed-client";
import { optionalSafeHrefSchema } from "@/lib/validation/common";
import type { FieldSpec } from "@/lib/blocks/admin-fields";
import { longTitle } from "@/lib/text/long-title";

const LAYOUTS = ["media-left", "media-right", "media-above"] as const;
const MEDIA_TYPES = ["video", "image"] as const;

// Flat fields (not a discriminated union) so the admin form can bind each
// one directly; the superRefine keeps the pair that matters consistent.
const schema = blockCommonSchema
  .extend({
    title: z.string().optional(),
    mediaType: z.enum(MEDIA_TYPES).default("video"),
    videoUrl: optionalSafeHrefSchema({ label: "Video URL" }),
    posterImageUrl: z.string().optional(),
    imageUrl: z.string().optional(),
    imageAlt: z.string().optional(),
    // Paragraphs separated by a blank line.
    body: z.string().optional(),
    layout: z.enum(LAYOUTS).default("media-left"),
  })
  .superRefine((data, ctx) => {
    if (data.mediaType === "image" && data.imageUrl && !data.imageAlt?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["imageAlt"], message: "Alt text is required for the image" });
    }
  });

export type MediaTextData = z.infer<typeof schema>;

function paragraphs(body: string | undefined): string[] {
  return (body ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

function Media({ data }: { data: MediaTextData }) {
  if (data.mediaType === "video") {
    return data.videoUrl ? (
      <VideoPlayer videoUrl={data.videoUrl} title={data.title} posterImageUrl={data.posterImageUrl} />
    ) : null;
  }
  if (!data.imageUrl) return null;
  return (
    <Image
      src={resolveMediaUrl(data.imageUrl)}
      alt={data.imageAlt ?? ""}
      width={1600}
      height={900}
      sizes="(min-width: 768px) 48rem, 100vw"
      className="h-auto w-full rounded-[var(--site-radius-lg)]"
    />
  );
}

/**
 * Media with its paragraph(s): beside it (left/right) from 768px up, or the
 * media above the text. Always stacked media-first on narrow screens, in every
 * layout. An empty title renders no heading.
 */
function Render({ data }: { data: MediaTextData }) {
  const texts = paragraphs(data.body);
  const hasMedia = data.mediaType === "video" ? Boolean(data.videoUrl) : Boolean(data.imageUrl);
  if (!hasMedia && texts.length === 0 && !data.title) return null;
  const side = data.layout !== "media-above" && hasMedia && texts.length > 0;

  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
    >
      {data.title && (
        <h2 {...longTitle(data.title)} className="mb-6 font-editorial text-section font-semibold text-balance">
          {data.title}
        </h2>
      )}
      <div className={side ? "grid grid-cols-1 gap-8 md:grid-cols-2 md:items-center" : "space-y-6"}>
        {hasMedia && (
          <div className={data.layout === "media-right" && side ? "md:order-2" : undefined}>
            <Media data={data} />
          </div>
        )}
        {texts.length > 0 && (
          <div className="space-y-4 text-base leading-relaxed">
            {texts.map((t, i) => (
              <p key={i}>{t}</p>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}

const adminFields: FieldSpec[] = [
  { key: "title", label: "Heading (leave empty for none)", type: "text", optional: true },
  { key: "layout", label: "Layout", type: "select", options: [...LAYOUTS] },
  { key: "mediaType", label: "Media", type: "select", options: [...MEDIA_TYPES] },
  { key: "videoUrl", label: "Video URL (video)", type: "text", optional: true },
  { key: "posterImageUrl", label: "Poster image (video)", type: "image", optional: true },
  { key: "imageUrl", label: "Image (image)", type: "image", optional: true },
  { key: "imageAlt", label: "Alt text (image)", type: "text", optional: true },
  { key: "body", label: "Text (blank line between paragraphs)", type: "textarea", optional: true },
];

export const mediaTextBlock = defineBlock({
  type: "media_text",
  label: "Media + text",
  category: "media",
  description:
    "A video or image with its paragraph(s) beside or under it — for the common 'video with the text that explains it' layout; media stacks above the text on phones.",
  schema,
  adminFields,
  defaults: {
    background: "cream",
    spacingTop: "md",
    spacingBottom: "md",
    mediaType: "video",
    videoUrl: null,
    layout: "media-left",
  },
  Render,
});
