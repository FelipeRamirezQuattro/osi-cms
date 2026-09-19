import { cookies } from "next/headers";
import { createServerDbClient } from "@/lib/db/client";
import type { PageMeta } from "@/lib/data/pages";
import { applicationHref, industryHref, postHref, productHref, resourceHref } from "@/lib/routes";
import { hashClientIp } from "@/lib/actions/form-submission-pipeline";
import { recordSearchQuery } from "@/lib/data/analytics-events";
import { SESSION_COOKIE, VISITOR_COOKIE } from "@/lib/analytics/cookies";

/**
 * Site-wide search (master prompt §9 Phase 6) — Postgres full-text via
 * the generated `search_vector` columns from migration 0016 (products)
 * and migration 0017 (page_publications), no external search service.
 * Each searchable table is queried independently (its own
 * `.textSearch()` call — Supabase JS has no cross-table FTS union) and
 * the results are normalized into one flat, ranked list.
 *
 * Pages are searched via `page_publications`, not `pages` — migration
 * 0017 removed public SELECT access to `pages` entirely (see CLAUDE.md
 * "Admin CMS" section), so an anonymous search request against `pages`
 * would silently return zero page results regardless of query. See that
 * migration's own search_vector column (mirrors this file's original
 * title/seo_description weighting, sourced from the jsonb snapshot since
 * there's no plain title column on page_publications).
 *
 * Task 8: `services` no longer exists as a table at all (dropped in a
 * prior task's migration — the /services/* route-collision question this
 * comment used to flag is moot). `news_posts` now has a real /news route
 * to land on (Task 8), so it's wired in here too via the same
 * search_vector + textSearch pattern as pages/products. `industries`/
 * `applications`/`resources` have no search_vector column (small,
 * hand-curated tables — a generated tsvector column isn't worth a
 * migration for them yet), so those three use a simple case-insensitive
 * `ilike` on name/title instead of full-text search.
 */

export type SearchResult = {
  type: "page" | "product" | "news" | "industry" | "application" | "resource";
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
  const ilikeQuery = `%${trimmed}%`;

  const [pages, products, news, industries, applications, resources] = await Promise.all([
    db
      .from("page_publications")
      .select("slug, snapshot")
      .textSearch("search_vector", tsQuery, { type: "plain", config: "english" })
      .limit(RESULTS_PER_TABLE),
    db
      .from("products")
      .select("slug, name, tagline, summary, product_categories(slug)")
      .eq("status", "published")
      .textSearch("search_vector", tsQuery, { type: "plain", config: "english" })
      .limit(RESULTS_PER_TABLE),
    db
      .from("news_posts")
      .select("slug, title, excerpt, kind")
      .eq("status", "published")
      .textSearch("search_vector", tsQuery, { type: "plain", config: "english" })
      .limit(RESULTS_PER_TABLE),
    db.from("industries").select("slug, name, description").eq("status", "published").ilike("name", ilikeQuery).limit(RESULTS_PER_TABLE),
    db
      .from("applications")
      .select("slug, name, description")
      .eq("status", "published")
      .ilike("name", ilikeQuery)
      .limit(RESULTS_PER_TABLE),
    db.from("resources").select("id, title, kind").eq("status", "published").ilike("title", ilikeQuery).limit(RESULTS_PER_TABLE),
  ]);

  const results: SearchResult[] = [];

  for (const row of pages.data ?? []) {
    // The `home` page's route is `/`, not `/home` — every other slug
    // (including `products`/`contact`, also is_system) maps 1:1.
    const meta = (row.snapshot as unknown as { meta: PageMeta }).meta;
    const href = row.slug === "home" ? "/" : `/${row.slug}`;
    results.push({ type: "page", title: meta.title, excerpt: meta.seo_description, href });
  }
  for (const row of products.data ?? []) {
    const categorySlug = (row.product_categories as { slug: string } | null)?.slug;
    if (!categorySlug) continue;
    results.push({
      type: "product",
      title: row.name,
      excerpt: row.tagline ?? row.summary,
      href: productHref(categorySlug, row.slug),
    });
  }
  for (const row of news.data ?? []) {
    results.push({ type: "news", title: row.title, excerpt: row.excerpt, href: postHref(row) });
  }
  for (const row of industries.data ?? []) {
    results.push({ type: "industry", title: row.name, excerpt: row.description, href: industryHref(row.slug) });
  }
  for (const row of applications.data ?? []) {
    results.push({ type: "application", title: row.name, excerpt: row.description, href: applicationHref(row.slug) });
  }
  for (const row of resources.data ?? []) {
    results.push({ type: "resource", title: row.title, excerpt: row.kind, href: resourceHref() });
  }

  await recordSearchQueryBestEffort(trimmed, results.length);

  return results;
}

// Feeds "Top Searches" / "Searches with No Results" / "Searches over
// Time" (Behavior). Never allowed to affect the search response itself —
// a logging failure must not break search for a real visitor.
async function recordSearchQueryBestEffort(query: string, resultsCount: number): Promise<void> {
  try {
    const cookieStore = await cookies();
    const ipHash = await hashClientIp();
    await recordSearchQuery({
      session_id: cookieStore.get(SESSION_COOKIE)?.value ?? null,
      visitor_id: cookieStore.get(VISITOR_COOKIE)?.value ?? null,
      query,
      results_count: resultsCount,
      ip_hash: ipHash,
    });
  } catch (err) {
    console.error("[search] Failed to record search query:", err);
  }
}
