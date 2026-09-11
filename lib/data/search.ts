import { createServerDbClient } from "@/lib/db/client";

/**
 * Site-wide search (master prompt §9 Phase 6) — Postgres full-text via
 * the generated `search_vector` columns from migration 0016, no external
 * search service. Each searchable table is queried independently (its
 * own `.textSearch()` call — Supabase JS has no cross-table FTS union)
 * and the results are normalized into one flat, ranked list.
 *
 * Scoped to `pages` and `products` only, NOT `news_posts`/`services`
 * despite the master prompt naming all four (§9: "search over
 * products/news/services/pages") — both tables are empty and, more
 * importantly, have no public route to land on yet. `/services/*` is
 * currently served by the `[...slug]` catch-all against `pages` (the
 * real, Phase-4-migrated Fluid Levels/Pump Cards/Machine Shop content);
 * a `services`-table-backed `/services/[slug]` route would collide with
 * and shadow those working pages at the same URLs. This is a real,
 * unresolved architectural question — see docs/DECISIONS.md — not
 * something to silently route around. Revisit once it's settled.
 */

export type SearchResult = {
  type: "page" | "product";
  title: string;
  excerpt: string | null;
  href: string;
};

const RESULTS_PER_TABLE = 8;

export async function searchSite(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const db = createServerDbClient();
  const tsQuery = trimmed.split(/\s+/).join(" & ");

  const [pages, products] = await Promise.all([
    db
      .from("pages")
      .select("slug, title, seo_description")
      .eq("status", "published")
      .textSearch("search_vector", tsQuery, { type: "plain", config: "english" })
      .limit(RESULTS_PER_TABLE),
    db
      .from("products")
      .select("slug, name, tagline, summary, product_categories(slug)")
      .eq("status", "published")
      .textSearch("search_vector", tsQuery, { type: "plain", config: "english" })
      .limit(RESULTS_PER_TABLE),
  ]);

  const results: SearchResult[] = [];

  for (const row of pages.data ?? []) {
    // The `home` page's route is `/`, not `/home` — every other slug
    // (including `products`/`contact`, also is_system) maps 1:1.
    const href = row.slug === "home" ? "/" : `/${row.slug}`;
    results.push({ type: "page", title: row.title, excerpt: row.seo_description, href });
  }
  for (const row of products.data ?? []) {
    const categorySlug = (row.product_categories as { slug: string } | null)?.slug;
    if (!categorySlug) continue;
    results.push({
      type: "product",
      title: row.name,
      excerpt: row.tagline ?? row.summary,
      href: `/products/${categorySlug}/${row.slug}`,
    });
  }

  return results;
}
