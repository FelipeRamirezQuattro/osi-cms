import Image from "next/image";
import { z } from "zod";
import { resolveMediaUrl } from "@/lib/media";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { ArrowButton } from "@/components/ui/arrow-button";
import { requiredString, optionalSafeHrefSchema } from "@/lib/validation/common";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

// Single instance, not a carousel (CLAUDE.md's Task 9 ruling) — for a
// rotating set of testimonials, a future carousel block would be a
// separate addition, not a mode on this one.
const schema = blockCommonSchema.extend({
  quote: requiredString("Quote"),
  attributionName: requiredString("Attribution name"),
  roleCompany: z.string().optional(),
  portraitUrl: z.string().optional(),
  sourceHref: optionalSafeHrefSchema({ label: "Source link" }),
});

type Data = z.infer<typeof schema>;

function Render({ data }: { data: Data }) {
  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
      contentClassName="mx-auto max-w-4xl px-5 text-center md:px-10"
    >
      <blockquote className="font-editorial text-section font-medium leading-snug text-balance">
        “{data.quote}”
      </blockquote>
      <div className="mt-6 flex flex-col items-center gap-3">
        {data.portraitUrl && (
          <div className="relative h-16 w-16 overflow-hidden rounded-full">
            <Image
              src={resolveMediaUrl(data.portraitUrl)}
              alt=""
              aria-hidden
              fill
              sizes="4rem"
              className="object-cover"
            />
          </div>
        )}
        <div>
          <p
            className={`text-sm font-semibold ${
              data.background === "cream" ? "text-osi-gold-700" : "text-osi-gold-500"
            }`}
          >
            {data.attributionName}
          </p>
          {data.roleCompany && (
            <p className={`text-sm ${data.background === "cream" ? "text-osi-slate-300" : "text-osi-slate-200"}`}>
              {data.roleCompany}
            </p>
          )}
        </div>
        {data.sourceHref && (
          <ArrowButton href={data.sourceHref} variant="ghost-arrow" className="mt-2">
            Source
          </ArrowButton>
        )}
      </div>
    </Section>
  );
}

const adminFields: FieldSpec[] = [
  { key: "quote", label: "Quote", type: "textarea" },
  { key: "attributionName", label: "Attribution name", type: "text" },
  { key: "roleCompany", label: "Role / company", type: "text", optional: true },
  { key: "portraitUrl", label: "Portrait / logo", type: "image", optional: true },
  { key: "sourceHref", label: "Source link", type: "text", optional: true },
];

export const quoteTestimonialBlock = defineBlock({
  type: "quote_testimonial",
  label: "Quote / testimonial",
  category: "content",
  description:
    "A single centered quote with attribution, role/company, and an optional portrait and source link — not a rotating carousel of multiple quotes.",
  schema,
  adminFields,
  defaults: {
    background: "navy",
    spacingTop: "md",
    spacingBottom: "md",
    quote: "",
    attributionName: "",
    sourceHref: null,
  },
  Render,
});
