import { createServerDbClient } from "@/lib/db/client";
import type { PageMeta } from "@/lib/data/pages";
import { applicationHref, industryHref, newsHref, productHref, resourceHref } from "@/lib/routes";

export type SitemapEntry = { url: string; lastModified: string };

/**
 * Backs app/sitemap.ts — kept in lib/data (not queried directly from the
 * route file) per CLAUDE.md constraint 2, same as every other DB access
 * point in the app.
 *
 * `services` no longer exists as a table (dropped in a prior task's
 * migration). `news_posts`/`industries`/`applications`/`resources` are
 * included as of Task 8, now that each has a real public route to land
 * on (/news, /news/[slug], /industries/[slug], /applications/[slug],
 * /resources) — `resources` itself is a single listing URL, not one
 * entry per row (there's no per-resource detail page, just download
 * links off the listing).
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

  const [pages, products, news, industries, applications, resources] = await Promise.all([
    db.from("page_publications").select("slug, published_at, snapshot"),
    db
      .from("products")
      .select("slug, updated_at, product_categories(slug)")
      .eq("status", "published"),
    db.from("news_posts").select("slug, updated_at").eq("status", "published").order("updated_at", { ascending: false }),
    db.from("industries").select("slug, updated_at").eq("status", "published"),
    db.from("applications").select("slug, updated_at").eq("status", "published"),
    db.from("resources").select("updated_at").eq("status", "published").order("updated_at", { ascending: false }).limit(1),
  ]);

  const now = new Date().toISOString();
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
    entries.push({ url: productHref(categorySlug, product.slug), lastModified: product.updated_at });
  }
  // /news and /resources are literal routes (not `pages` rows), so unlike
  // /products (a seeded `pages` row already covered by the loop above)
  // they need an explicit listing entry regardless of whether any
  // content exists yet under them.
  entries.push({ url: newsHref(), lastModified: news.data?.[0]?.updated_at ?? now });
  for (const post of news.data ?? []) {
    entries.push({ url: newsHref(post.slug), lastModified: post.updated_at });
  }
  for (const industry of industries.data ?? []) {
    entries.push({ url: industryHref(industry.slug), lastModified: industry.updated_at });
  }
  for (const application of applications.data ?? []) {
    entries.push({ url: applicationHref(application.slug), lastModified: application.updated_at });
  }
  entries.push({ url: resourceHref(), lastModified: resources.data?.[0]?.updated_at ?? now });

  return entries;
}
