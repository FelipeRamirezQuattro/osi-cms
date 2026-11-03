import { cookies, headers } from "next/headers";
import { detectBot } from "@/lib/analytics/bot-detection";
import { createServerDbClient } from "@/lib/db/client";
import type { PageMeta } from "@/lib/data/pages";
import { applicationHref, industryHref, postHref, productHref, resourceHref } from "@/lib/routes";
import { hashClientIp } from "@/lib/actions/form-submission-pipeline";
import { recordSearchQuery } from "@/lib/data/analytics-events";
import { SESSION_COOKIE, VISITOR_COOKIE } from "@/lib/analytics/cookies";
import { escapeLikePattern, normalizeSearchQuery } from "@/lib/search-query";
import { buildSnippet } from "@/lib/search-snippet";

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
 *
 * P6 (migration 0061): the vectors also cover the visible body text — pages
 * (published snapshot, hidden blocks left out), news and blog posts, and
 * products (via the product_search_documents view). The matching body text
 * comes back with each row so the result can show a ~160-character snippet.
 */

export type SearchResult = {
  type: "page" | "product" | "news" | "industry" | "application" | "resource";
  title: string;
  excerpt: string | null;
  /** About 160 characters of the visible body around the match (migration 0061); null when the match is only in the title/summary. */
  snippet: string | null;
  href: string;
};

const RESULTS_PER_TABLE = 8;

export async function searchSite(query: string): Promise<SearchResult[]> {
  const trimmed = normalizeSearchQuery(query);
  if (!trimmed) return [];

  const db = createServerDbClient();
  // `type: "plain"` parses with plainto_tsquery, which ignores punctuation, so
  // quotes and operators in the text can't produce a syntax error.
  const tsQuery = trimmed.split(/\s+/).join(" & ");
  // The ilike tables match literally: a typed `%` or `_` is not a wildcard.
  const ilikeQuery = `%${escapeLikePattern(trimmed)}%`;

  const fts = { type: "plain", config: "english" } as const;

  // Body text needs migration 0061. Until it is applied (or if a column is ever missing) each of these falls back to the
  // original title/summary query, so the search never breaks because of deploy order.
  const pagesQuery = async () => {
    const full = await db.from("page_publications").select("slug, snapshot, search_body").textSearch("search_vector", tsQuery, fts).limit(RESULTS_PER_TABLE);
    if (!full.error) return full.data;
    const plain = await db.from("page_publications").select("slug, snapshot").textSearch("search_vector", tsQuery, fts).limit(RESULTS_PER_TABLE);
    return (plain.data ?? []).map((row) => ({ ...row, search_body: null as string | null }));
  };
  const productsQuery = async () => {
    // product_search_documents aggregates a product's body, benefits, stages, specs and visible extra blocks.
    const full = await db
      .from("product_search_documents")
      .select("slug, name, tagline, summary, category_slug, body_text")
      .eq("status", "published")
      .textSearch("search_vector", tsQuery, fts)
      .limit(RESULTS_PER_TABLE);
    if (!full.error) return full.data;
    const plain = await db
      .from("products")
      .select("slug, name, tagline, summary, product_categories(slug)")
      .eq("status", "published")
      .textSearch("search_vector", tsQuery, fts)
      .limit(RESULTS_PER_TABLE);
    return (plain.data ?? []).map((row) => ({
      slug: row.slug,
      name: row.name,
      tagline: row.tagline,
      summary: row.summary,
      category_slug: (row.product_categories as { slug: string } | null)?.slug ?? null,
      body_text: null as string | null,
    }));
  };
  const newsQuery = async () => {
    const full = await db.from("news_posts").select("slug, title, excerpt, kind, search_body").eq("status", "published").textSearch("search_vector", tsQuery, fts).limit(RESULTS_PER_TABLE);
    if (!full.error) return full.data;
    const plain = await db.from("news_posts").select("slug, title, excerpt, kind").eq("status", "published").textSearch("search_vector", tsQuery, fts).limit(RESULTS_PER_TABLE);
    return (plain.data ?? []).map((row) => ({ ...row, search_body: null as string | null }));
  };

  const [pages, products, news, industries, applications, resources] = await Promise.all([
    pagesQuery(),
    productsQuery(),
    newsQuery(),
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

  for (const row of pages) {
    // The `home` page's route is `/`, not `/home` — every other slug
    // (including `products`/`contact`, also is_system) maps 1:1.
    const meta = (row.snapshot as unknown as { meta: PageMeta }).meta;
    const href = row.slug === "home" ? "/" : `/${row.slug}`;
    results.push({ type: "page", title: meta.title, excerpt: meta.seo_description, snippet: buildSnippet(row.search_body, trimmed), href });
  }
  for (const row of products) {
    if (!row.category_slug || !row.slug || !row.name) continue;
    results.push({
      type: "product",
      title: row.name,
      excerpt: row.tagline ?? row.summary,
      snippet: buildSnippet(row.body_text, trimmed),
      href: productHref(row.category_slug, row.slug),
    });
  }
  for (const row of news) {
    results.push({ type: "news", title: row.title, excerpt: row.excerpt, snippet: buildSnippet(row.search_body, trimmed), href: postHref(row) });
  }
  for (const row of industries.data ?? []) {
    results.push({ type: "industry", title: row.name, excerpt: row.description, snippet: null, href: industryHref(row.slug) });
  }
  for (const row of applications.data ?? []) {
    results.push({ type: "application", title: row.name, excerpt: row.description, snippet: null, href: applicationHref(row.slug) });
  }
  for (const row of resources.data ?? []) {
    results.push({ type: "resource", title: row.title, excerpt: row.kind, snippet: null, href: resourceHref() });
  }

  await recordSearchQueryBestEffort(trimmed, results.length);

  return results;
}

// Feeds "Top Searches" / "Searches with No Results" / "Searches over
// Time" (Behavior). Never allowed to affect the search response itself —
// a logging failure must not break search for a real visitor.
async function recordSearchQueryBestEffort(query: string, resultsCount: number): Promise<void> {
  try {
    // Crawlers are not visitors: their queries would pollute "Top Searches".
    if (detectBot((await headers()).get("user-agent"))) return;
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
