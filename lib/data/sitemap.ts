import { createServerDbClient } from "@/lib/db/client";

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
 */
export async function getSitemapEntries(): Promise<SitemapEntry[]> {
  const db = createServerDbClient();

  const [pages, products] = await Promise.all([
    db.from("pages").select("slug, updated_at, noindex").eq("status", "published"),
    db
      .from("products")
      .select("slug, updated_at, product_categories(slug)")
      .eq("status", "published"),
  ]);

  const entries: SitemapEntry[] = [];

  for (const page of pages.data ?? []) {
    if (page.noindex) continue;
    const path = page.slug === "home" ? "/" : `/${page.slug}`;
    entries.push({ url: path, lastModified: page.updated_at });
  }
  for (const product of products.data ?? []) {
    const categorySlug = (product.product_categories as { slug: string } | null)?.slug;
    if (!categorySlug) continue;
    entries.push({ url: `/products/${categorySlug}/${product.slug}`, lastModified: product.updated_at });
  }

  return entries;
}
