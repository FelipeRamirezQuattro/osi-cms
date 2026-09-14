import { createServerDbClient } from "@/lib/db/client";
import type { PageMeta } from "@/lib/data/pages";

export type SitemapEntry = { url: string; lastModified: string };

/**
 * Backs app/sitemap.ts — kept in lib/data (not queried directly from the
 * route file) per CLAUDE.md constraint 2, same as every other DB access
 * point in the app.
 *
 * Only `pages` and `products` — `news_posts`/`services` are excluded for
 * the same reason lib/data/search.ts excludes them: both are empty and
 * have no public route yet. See that file's comment and
 * docs/DECISIONS.md.
 *
 * Reads `page_publications`, not `pages` — migration 0017 (see CLAUDE.md
 * "Admin CMS" section on the draft/publish version model) removed public
 * SELECT access to `pages` entirely, so an anonymous sitemap request
 * against `pages` would silently return zero page entries. The snapshot's
 * `published_at` is also a more accurate "last modified" for a public URL
 * than `pages.updated_at`, which can reflect unpublished draft edits.
 */
export async function getSitemapEntries(): Promise<SitemapEntry[]> {
  const db = createServerDbClient();

  const [pages, products] = await Promise.all([
    db.from("page_publications").select("slug, published_at, snapshot"),
    db
      .from("products")
      .select("slug, updated_at, product_categories(slug)")
      .eq("status", "published"),
  ]);

  const entries: SitemapEntry[] = [];

  for (const page of pages.data ?? []) {
    const meta = (page.snapshot as unknown as { meta: PageMeta }).meta;
    if (meta.noindex) continue;
    const path = page.slug === "home" ? "/" : `/${page.slug}`;
    entries.push({ url: path, lastModified: page.published_at });
  }
  for (const product of products.data ?? []) {
    const categorySlug = (product.product_categories as { slug: string } | null)?.slug;
    if (!categorySlug) continue;
    entries.push({ url: `/products/${categorySlug}/${product.slug}`, lastModified: product.updated_at });
  }

  return entries;
}
