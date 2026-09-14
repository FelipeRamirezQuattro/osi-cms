import { z } from "zod";
import {
  emptyStringToNull,
  optionalNullableString,
  optionalSafeHrefSchema,
  requiredString,
  slugSchema,
} from "@/lib/validation/common";
import { tiptapDocSchema } from "@/lib/validation/rich-text";

/**
 * lib/actions/products.ts's saveProductAction currently accepts the
 * bespoke product editor's flat form values as `any` (documented as
 * necessary for the untyped FieldRenderer form — see CLAUDE.md — but
 * that untyped *shape* doesn't mean it should go unvalidated). This is
 * the full input shape after benefits/stages/specs/industries/
 * applications have been split back out client-side of this schema in
 * the action; `locale`/`position` are injected by the action itself
 * (never user input), so they're not modeled here.
 */

const productBadgeSchema = z.preprocess(
  (value) => (value === "none" ? null : value),
  z.enum(["new", "featured"]).nullable().default(null),
);

export const productBenefitSchema = z.object({
  title: requiredString("Benefit title"),
  body: optionalNullableString(),
  icon_key: optionalNullableString(),
});

export const productStageSchema = z.object({
  title: requiredString("Stage title"),
  body: optionalNullableString(),
  image_url: optionalNullableString(),
});

export const productSpecSchema = z.object({
  label: requiredString("Spec label"),
  value: requiredString("Spec value"),
  unit: optionalNullableString(),
});

export const productSaveInputSchema = z
  .object({
    name: requiredString("Name"),
    slug: slugSchema("Slug"),
    // "" (no category picked in the <select>) must normalize to null
    // rather than fail as a bad relation id.
    category_id: z.preprocess(emptyStringToNull, z.string().nullable().default(null)),
    eyebrow: optionalNullableString(),
    tagline: optionalNullableString(),
    badge: productBadgeSchema,
    summary: optionalNullableString(),
    body: z.preprocess((v) => (v === undefined ? null : v), tiptapDocSchema.nullable().default(null)),
    hero_image_url: optionalNullableString(),
    diagram_image_url: optionalNullableString(),
    // Rendered via VideoEmbedRender on the product detail page (see
    // CLAUDE.md's content gaps — no legacy video URLs exist yet, so this
    // renders nothing on every real product today, but the plumbing is
    // real).
    video_url: optionalSafeHrefSchema({ label: "Video URL" }),
    // Rendered as a real `<a href>` on the product detail page (via
    // HowItWorksRender's pdfUrl, app/(site)/products/[category]/[slug]/page.tsx).
    brochure_pdf_url: optionalSafeHrefSchema({ label: "Brochure PDF URL" }),
    // Rendered as a real `<a href>` on the product detail page (via
    // HowItWorksRender's model3dUrl) — same pattern as brochure_pdf_url.
    model_3d_url: optionalSafeHrefSchema({ label: "3D model URL" }),
    status: z.enum(["draft", "published"]),
    seo_title: optionalNullableString(),
    seo_description: optionalNullableString(),
    benefits: z.array(productBenefitSchema).default([]),
    stages: z.array(productStageSchema).default([]),
    specs: z.array(productSpecSchema).default([]),
    industries: z.array(z.string()).default([]),
    applications: z.array(z.string()).default([]),
    related_product_ids: z.array(z.string()).default([]),
  })
  .superRefine((data, ctx) => {
    // A product's canonical URL (/products/[category]/[slug]) is built
    // from its category's slug — a published product with no category
    // has no working URL, so this must hold before status can be
    // "published", not just checked once at creation.
    if (data.status === "published" && !data.category_id) {
      ctx.addIssue({
        code: "custom",
        path: ["category_id"],
        message: "Category is required before a product can be published — its URL is built from the category's slug.",
      });
    }
  });

export type ProductSaveInput = z.infer<typeof productSaveInputSchema>;
