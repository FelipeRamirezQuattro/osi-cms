import { z } from "zod";
import { optionalNullableString, requiredString, slugSchema } from "@/lib/validation/common";

/**
 * lib/actions/pages.ts's createPageAction/saveDraftAction accept
 * PageMeta (lib/data/pages.ts) as a plain typed object with no runtime
 * validation — TypeScript only checks the shape, not that `title` isn't
 * `""` or `slug` is well formed. `template` mirrors the DB check
 * constraint in supabase/migrations/0004_pages.sql.
 */
export const PAGE_TEMPLATES = ["standard", "landing", "legal", "product", "contact"] as const;

export const pageMetaSchema = z.object({
  slug: slugSchema("Slug"),
  locale: z.string().trim().min(2, "Locale is required").default("en"),
  title: requiredString("Title"),
  template: z.enum(PAGE_TEMPLATES),
  seo_title: optionalNullableString(),
  seo_description: optionalNullableString(),
  og_image_url: optionalNullableString(),
  noindex: z.boolean().default(false),
});

export type PageMetaInput = z.infer<typeof pageMetaSchema>;

/** duplicatePageAction's newSlug argument — same format rules as any other page slug. */
export const newPageSlugSchema = slugSchema("Slug");
