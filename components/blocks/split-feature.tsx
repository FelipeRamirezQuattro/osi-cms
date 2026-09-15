import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { DuotoneImage } from "@/components/ui/duotone-image";
import { CtaBreakoutBar } from "@/components/ui/cta-breakout-bar";
import { requiredString, safeHrefSchema } from "@/lib/validation/common";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

const linkSchema = z.object({ label: requiredString("Link label"), href: safeHrefSchema({ allowAnchor: true, label: "Link" }) });

const schema = blockCommonSchema.extend({
  title: requiredString("Title"),
  body: z.string().optional(),
  links: z.array(linkSchema).max(8).default([]),
  imageUrl: z.string().optional(),
  cta: z
    .object({ label: requiredString("CTA label"), href: safeHrefSchema({ allowAnchor: true, label: "CTA link" }) })
    .optional(),
});

type Data = z.infer<typeof schema>;

function Render({ data }: { data: Data }) {
  const half = Math.ceil(data.links.length / 2);
  const columns = [data.links.slice(0, half), data.links.slice(half)];

  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom="lg"
      anchorId={data.anchorId}
      contentClassName="relative mx-auto max-w-6xl px-6 md:px-12"
    >
      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        <div>
          <h2 className="font-display text-section tracking-tightest-display uppercase">
            {data.title}
          </h2>
          {data.body && (
            <p className={`mt-4 max-w-md ${data.background === "cream" ? "text-osi-slate-300" : "text-osi-slate-200"}`}>
              {data.body}
            </p>
          )}
          {data.links.length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3">
              {columns.map((col, i) => (
                <ul key={i} className="space-y-3">
                  {col.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="text-sm hover:underline">
                        → {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          )}
        </div>
        <DuotoneImage src={data.imageUrl} className="aspect-[4/3] w-full" intensity={0.35} />
      </div>
      {data.cta && (
        <CtaBreakoutBar href={data.cta.href} className="absolute right-8 bottom-0 z-10 translate-y-1/2">
          {data.cta.label}
        </CtaBreakoutBar>
      )}
    </Section>
  );
}

const adminFields: FieldSpec[] = [
  { key: "title", label: "Title", type: "text" },
  { key: "body", label: "Body", type: "textarea", optional: true },
  {
    key: "links",
    label: "Links",
    type: "array",
    maxItems: 8,
    itemFields: [
      { key: "label", label: "Label", type: "text" },
      { key: "href", label: "Link", type: "text" },
    ],
  },
  { key: "imageUrl", label: "Image", type: "image", optional: true },
  {
    key: "cta",
    label: "Breakout CTA",
    type: "object",
    optional: true,
    fields: [
      { key: "label", label: "Label", type: "text" },
      { key: "href", label: "Link", type: "text" },
    ],
  },
];

export const splitFeatureBlock = defineBlock({
  type: "split_feature",
  label: "Split feature",
  category: "content",
  description: "Two-column text-plus-image feature with an optional link list and breakout CTA — use for a substantial single-topic section, e.g. an about/history block.",
  schema,
  defaults: { background: "navy", spacingTop: "md", spacingBottom: "lg", title: "", links: [] },
  Render,
  adminFields,
});
