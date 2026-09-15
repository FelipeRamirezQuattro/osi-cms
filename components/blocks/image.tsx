import Image from "next/image";
import { z } from "zod";
import { resolveMediaUrl } from "@/lib/media";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { requiredString, optionalSafeHrefSchema } from "@/lib/validation/common";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

const ASPECT_RATIOS = ["16:9", "4:3", "1:1", "auto"] as const;
const ALIGNMENTS = ["left", "center", "right", "full"] as const;
const FOCAL_POINTS = ["center", "top", "bottom", "left", "right"] as const;

// A single feature image — for a multi-image grid see image_gallery.
// `decorative` is the one genuinely new accessibility control in this
// codebase's blocks: when true, the schema doesn't require `alt` at all
// (an empty/absent alt is exactly correct for a decorative image per
// WCAG) and Render forces alt="" regardless of what's stored; when
// false, `alt` must be real (non-empty) text — see the superRefine
// below. This mirrors "Alt text is enforced at the media library's
// upload chokepoint" (CLAUDE.md, Phase 7) at the per-use level: the
// upload itself always has alt text, but not every *use* of an image is
// meaningful content (a purely decorative divider photo, say).
const schema = blockCommonSchema
  .extend({
    imageUrl: requiredString("Image"),
    alt: z.string().optional(),
    decorative: z.boolean().default(false),
    caption: z.string().optional(),
    credit: z.string().optional(),
    aspectRatio: z.enum(ASPECT_RATIOS).default("auto"),
    alignment: z.enum(ALIGNMENTS).default("center"),
    // Scoped down to a small object-position preset (CLAUDE.md's Task 9
    // ruling) — no interactive x/y drag-picker exists in this project.
    focalPoint: z.enum(FOCAL_POINTS).default("center"),
    href: optionalSafeHrefSchema({ label: "Link" }),
  })
  .superRefine((data, ctx) => {
    if (!data.decorative && (!data.alt || data.alt.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["alt"],
        message: "Alt text is required unless the image is marked decorative",
      });
    }
  });

type Data = z.infer<typeof schema>;

const ASPECT_CLASS: Record<(typeof ASPECT_RATIOS)[number], string> = {
  "16:9": "aspect-video",
  "4:3": "aspect-[4/3]",
  "1:1": "aspect-square",
  auto: "",
};

const ALIGNMENT_CLASS: Record<(typeof ALIGNMENTS)[number], string> = {
  left: "mr-auto max-w-xl",
  center: "mx-auto max-w-3xl",
  right: "ml-auto max-w-xl",
  full: "w-full",
};

const FOCAL_CLASS: Record<(typeof FOCAL_POINTS)[number], string> = {
  center: "object-center",
  top: "object-top",
  bottom: "object-bottom",
  left: "object-left",
  right: "object-right",
};

function Render({ data }: { data: Data }) {
  const alt = data.decorative ? "" : (data.alt ?? "");
  const src = resolveMediaUrl(data.imageUrl);

  const img =
    data.aspectRatio === "auto" ? (
      // No known intrinsic dimensions for an arbitrary uploaded asset —
      // `h-auto w-full` lets the browser's own natural aspect ratio
      // drive layout regardless of the width/height hint passed to
      // next/image (same non-`fill` approach as logo-strip.tsx, just
      // scaled to fill the column instead of a fixed logo size).
      <Image
        src={src}
        alt={alt}
        aria-hidden={data.decorative || undefined}
        width={1600}
        height={900}
        sizes="(min-width: 768px) 48rem, 100vw"
        className={`h-auto w-full ${FOCAL_CLASS[data.focalPoint]}`}
      />
    ) : (
      <div className={`relative overflow-hidden ${ASPECT_CLASS[data.aspectRatio]}`}>
        <Image
          src={src}
          alt={alt}
          aria-hidden={data.decorative || undefined}
          fill
          sizes="(min-width: 768px) 48rem, 100vw"
          className={`object-cover ${FOCAL_CLASS[data.focalPoint]}`}
        />
      </div>
    );

  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
      reveal={false}
    >
      <figure className={ALIGNMENT_CLASS[data.alignment]}>
        {data.href ? (
          <a href={data.href} className="block">
            {img}
          </a>
        ) : (
          img
        )}
        {(data.caption || data.credit) && (
          <figcaption className="mt-2 text-sm opacity-70">
            {data.caption}
            {data.caption && data.credit ? " — " : ""}
            {data.credit}
          </figcaption>
        )}
      </figure>
    </Section>
  );
}

const adminFields: FieldSpec[] = [
  { key: "imageUrl", label: "Image", type: "image" },
  { key: "decorative", label: "Decorative (no alt text needed)", type: "boolean" },
  { key: "alt", label: "Alt text", type: "text", optional: true },
  { key: "caption", label: "Caption", type: "text", optional: true },
  { key: "credit", label: "Credit", type: "text", optional: true },
  { key: "aspectRatio", label: "Aspect ratio", type: "select", options: [...ASPECT_RATIOS] },
  { key: "alignment", label: "Alignment", type: "select", options: [...ALIGNMENTS] },
  { key: "focalPoint", label: "Focal point", type: "select", options: [...FOCAL_POINTS] },
  { key: "href", label: "Link (optional)", type: "text", optional: true },
];

export const imageBlock = defineBlock({
  type: "image",
  label: "Image",
  category: "media",
  description:
    "A single feature image with caption/credit, aspect ratio, alignment, and a focal-point preset — for a multi-image grid use Image gallery instead.",
  schema,
  adminFields,
  defaults: {
    background: "cream",
    spacingTop: "md",
    spacingBottom: "md",
    imageUrl: "",
    decorative: false,
    aspectRatio: "auto",
    alignment: "center",
    focalPoint: "center",
    href: null,
  },
  Render,
});
