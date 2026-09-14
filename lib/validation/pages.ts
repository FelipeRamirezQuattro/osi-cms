import { z } from "zod";
import { optionalNullableString, requiredString, slugSchema } from "@/lib/validation/common";

/**
 * lib/actions/pages.ts's createPageAction/saveDraftAction accept
 * PageMeta (lib/data/pages.ts) as a plain typed object with no runtime
 * validation — TypeScript only checks the shape, not that `title` isn't
 * `""` or `slug` is well formed. `template` mirrors the DB check
 * constraint in supabase/migrations/0004_pages.sql.
 */
/**
 * A one-time creation preset (see createPageAction), not a runtime
 * behavior switch — nothing on the public rendering path branches on
 * `template`. "product" was removed (Task 7 item #8): real products
 * live in their own `products` table/route (app/(site)/products/
 * [category]/[slug]/page.tsx), never in `pages`/`page_blocks`, so
 * offering it here was actively misleading. The column itself stays
 * (an accurate historical record of which starter blocks a page got at
 * creation), just with a narrower, honest set of options going forward.
 */
export const PAGE_TEMPLATES = ["standard", "landing", "legal", "contact"] as const;

export type PageTemplate = (typeof PAGE_TEMPLATES)[number];

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
