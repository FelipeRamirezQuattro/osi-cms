/**
 * One-off, idempotent connectivity check for the Google Search Console
 * service account before wiring the SEO admin UI to it (Phase 8b). Calls
 * the raw, uncached query path (querySearchAnalytics) directly — this
 * script runs outside any Next.js request context, so it can't use
 * createServerDbClient()/the analytics_gsc_cache table (same wall every
 * other script in this repo hits; see docs/DECISIONS.md).
 *
 *   pnpm exec tsx --env-file=.env.local scripts/verify-gsc-connection.ts
 */
import { querySearchAnalytics } from "../lib/data/seo-search-console";

async function main() {
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  console.log(`Querying Search Console top queries for ${startDate}..${endDate}...`);
  const rows = await querySearchAnalytics({ startDate, endDate }, ["query"], 10);

  if (rows.length === 0) {
    console.log("Connected, but no rows returned (no search traffic in this window, or a brand-new property).");
    return;
  }

  console.log(`Connected. Top ${rows.length} queries:`);
  for (const row of rows) {
    console.log(`  ${row.keys[0]} — clicks: ${row.clicks}, impressions: ${row.impressions}, position: ${row.position.toFixed(1)}`);
  }
}

main().catch((err) => {
  console.error("Search Console connection check failed:", err);
  process.exit(1);
});
