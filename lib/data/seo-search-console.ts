import { createHash } from "node:crypto";
import { createServerDbClient } from "@/lib/db/client";
import { getSearchConsoleAccessToken } from "@/lib/google/service-account-auth";
import type { Json } from "@/lib/db/database.types";

/**
 * Google Search Console data for the SEO admin report (Phase 8b) — see
 * docs/DECISIONS.md for why this hand-rolls the REST calls instead of
 * adding the `googleapis` package, and why caching is a lazy DB-backed
 * TTL rather than a Vercel Cron warm job.
 */

const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
// GSC data updates roughly daily, so re-checking twice a day is plenty —
// keeps this well under Search Console's own query rate limits.
const CACHE_TTL_MINUTES = 60 * 12;

export type DateRange = { startDate: string; endDate: string }; // YYYY-MM-DD

export type SearchPerformancePoint = {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};
export type TopQueryRow = { query: string; clicks: number; impressions: number; ctr: number; position: number };
export type TopPageRow = { page: string; clicks: number; impressions: number; ctr: number; position: number };

type GscRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function hashParams(params: unknown): string {
  return createHash("sha256").update(JSON.stringify(params)).digest("hex");
}

async function queryCached<T>(reportKey: string, params: unknown, fetcher: () => Promise<T>): Promise<T> {
  const hash = hashParams(params);
  const db = createServerDbClient();

  const { data: cached } = await db
    .from("analytics_gsc_cache")
    .select("response, fetched_at")
    .eq("report_key", reportKey)
    .eq("params_hash", hash)
    .maybeSingle();

  if (cached) {
    const ageMinutes = (Date.now() - new Date(cached.fetched_at).getTime()) / 60_000;
    if (ageMinutes < CACHE_TTL_MINUTES) {
      return cached.response as T;
    }
  }

  const fresh = await fetcher();
  await db.from("analytics_gsc_cache").upsert(
    { report_key: reportKey, params_hash: hash, response: fresh as unknown as Json, fetched_at: new Date().toISOString() },
    { onConflict: "report_key,params_hash" },
  );

  return fresh;
}

/**
 * The raw, uncached Search Console REST call — exported alongside the
 * cached report functions below so scripts/verify-gsc-connection.ts (run
 * outside any Next.js request context, so it can't use
 * createServerDbClient()/the cache table) can exercise the exact same
 * live-fetch path without touching the DB.
 */
export async function querySearchAnalytics(range: DateRange, dimensions: string[], rowLimit: number): Promise<GscRow[]> {
  const email = requireEnv("GSC_SERVICE_ACCOUNT_EMAIL");
  const privateKey = requireEnv("GSC_SERVICE_ACCOUNT_PRIVATE_KEY").replace(/\\n/g, "\n");
  const siteUrl = requireEnv("GSC_SITE_URL");

  const accessToken = await getSearchConsoleAccessToken({
    serviceAccountEmail: email,
    privateKeyPem: privateKey,
    scope: SCOPE,
  });

  const response = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ startDate: range.startDate, endDate: range.endDate, dimensions, rowLimit }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Search Console query failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as { rows?: GscRow[] };
  return data.rows ?? [];
}

/** Also backs "Average Position over Time" — one query, two chart series. */
export async function getSearchPerformanceOverTime(range: DateRange): Promise<SearchPerformancePoint[]> {
  return queryCached("search_performance_over_time", range, async () => {
    const rows = await querySearchAnalytics(range, ["date"], 1000);
    return rows.map((row) => ({
      date: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }));
  });
}

export async function getTopSearchQueries(range: DateRange, limit = 20): Promise<TopQueryRow[]> {
  return queryCached("top_search_queries", { ...range, limit }, async () => {
    const rows = await querySearchAnalytics(range, ["query"], limit);
    return rows.map((row) => ({
      query: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }));
  });
}

export async function getTopPagesInSearchResults(range: DateRange, limit = 20): Promise<TopPageRow[]> {
  return queryCached("top_pages_search_results", { ...range, limit }, async () => {
    const rows = await querySearchAnalytics(range, ["page"], limit);
    return rows.map((row) => ({
      page: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }));
  });
}
