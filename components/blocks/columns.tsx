import Image from "next/image";
import { z } from "zod";
import { resolveMediaUrl } from "@/lib/media";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { ArrowButton } from "@/components/ui/arrow-button";
import { AnimatedGroup, AnimatedItem } from "@/components/ui/animated-group";
import { requiredString, optionalSafeHrefSchema, safeHrefSchema } from "@/lib/validation/common";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

// A deliberately non-recursive first version (CLAUDE.md's Task 9
// ruling): each column holds exactly ONE of text/image/cta, never an
// array of items. Distinct field names per branch (heading/body vs.
// imageUrl/imageAlt/imageHref vs. ctaLabel/ctaHref) rather than reusing
// e.g. one shared "href" — see the admin fields comment below for why
// that matters for the flat admin form.
const columnItemSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), heading: requiredString("Heading"), body: z.string().optional() }),
  z.object({
    type: z.literal("image"),
    imageUrl: requiredString("Image"),
    imageAlt: z.string().optional(),
    imageHref: optionalSafeHrefSchema({ label: "Image link" }),
  }),
  z.object({
    type: z.literal("cta"),
    ctaLabel: requiredString("Button label"),
    ctaHref: safeHrefSchema({ allowAnchor: true, label: "Button link" }),
  }),
]);

const schema = blockCommonSchema.extend({
  columns: z.array(columnItemSchema).min(2).max(3),
});

type Data = z.infer<typeof schema>;
type ColumnItem = Data["columns"][number];

const COLS_CLASS: Record<number, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
};

function ColumnContent({ item, background }: { item: ColumnItem; background: Data["background"] }) {
  if (item.type === "text") {
    return (
      <div>
        <h3 className="font-display text-card-label tracking-wide-display uppercase">{item.heading}</h3>
        {item.body && <p className="mt-3 text-sm opacity-80">{item.body}</p>}
      </div>
    );
  }
  if (item.type === "image") {
    const img = (
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <Image
          src={resolveMediaUrl(item.imageUrl)}
          alt={item.imageAlt ?? ""}
          fill
          sizes="(min-width: 768px) 24rem, 100vw"
          className="object-cover"
        />
      </div>
    );
    return item.imageHref ? (
      <a href={item.imageHref} className="block">
        {img}
      </a>
    ) : (
      img
    );
  }
  return (
    <ArrowButton href={item.ctaHref} variant={background === "navy" ? "outline-light" : "outline-dark"}>
      {item.ctaLabel}
    </ArrowButton>
  );
}

function Render({ data }: { data: Data }) {
  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
      reveal={false}
    >
      <AnimatedGroup className={`grid grid-cols-1 gap-8 ${COLS_CLASS[data.columns.length] ?? ""}`}>
        {data.columns.map((item, i) => (
          <AnimatedItem key={i}>
            <ColumnContent item={item} background={data.background} />
          </AnimatedItem>
        ))}
      </AnimatedGroup>
    </Section>
  );
}

// Every field for all three item types is shown flat, always — there's
// no conditional-field-visibility machinery in FieldRenderer (and
// building one is exactly the kind of new picker/form UI Task 9 is
// scoped to avoid). Distinct field names per type mean an editor
// switching "Content type" back and forth never overwrites another
// type's data, and the Zod discriminated union above simply strips
// whichever fields don't belong to the selected `type` at save time.
const adminFields: FieldSpec[] = [
  {
    key: "columns",
    label: "Columns",
    type: "array",
    minItems: 2,
    maxItems: 3,
    itemFields: [
      { key: "type", label: "Content type", type: "select", options: ["text", "image", "cta"] },
      { key: "heading", label: "Heading (text type)", type: "text", optional: true },
      { key: "body", label: "Body (text type)", type: "textarea", optional: true },
      { key: "imageUrl", label: "Image (image type)", type: "image", optional: true },
      { key: "imageAlt", label: "Alt text (image type)", type: "text", optional: true },
      { key: "imageHref", label: "Image link (image type, optional)", type: "text", optional: true },
      { key: "ctaLabel", label: "Button label (cta type)", type: "text", optional: true },
      { key: "ctaHref", label: "Button link (cta type)", type: "text", optional: true },
    ],
  },
];

export const columnsBlock = defineBlock({
  type: "columns",
  label: "Columns",
  category: "layout",
  description:
    "2-3 columns, each one plain text block, one image, or one CTA button — not a nested layout container; for text-only link lists use Link columns instead.",
  schema,
  adminFields,
  defaults: { background: "cream", spacingTop: "md", spacingBottom: "md", columns: [] },
  Render,
});
