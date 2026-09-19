import { createServerDbClient } from "@/lib/db/client";
import { countByKey, isBlogPath, seriesByDate, seriesByHour, trafficSourceLabel } from "@/lib/analytics/report-aggregation";

/**
 * Read side of the Visitors Dashboard (Phase 8c) — every report the
 * admin UI renders is a named function here, built on a small set of
 * shared fetch/aggregate helpers rather than ~25 unrelated one-offs.
 * Aggregation happens in TypeScript over date-range-filtered raw rows,
 * not bespoke Postgres functions per report shape — this site's traffic
 * volume (hundreds to low thousands of rows/month, per the legacy Wix
 * dashboard) doesn't justify spreading business logic into more one-off
 * DB functions; revisit only if real row counts ever make this slow. See
 * docs/DECISIONS.md.
 *
 * Every function here is staff-only by construction: they use
 * createServerDbClient() (cookie-bound, RLS-enforced), and RLS on every
 * table this file reads grants SELECT to `public.is_staff()` only — an
 * unauthenticated caller gets zero rows back, not an error.
 */

export type DateRange = { startDate: string; endDate: string }; // YYYY-MM-DD, inclusive

function rangeToTimestamps(range: DateRange): { gte: string; lt: string } {
  const gte = `${range.startDate}T00:00:00.000Z`;
  const lt = new Date(new Date(`${range.endDate}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000).toISOString();
  return { gte, lt };
}

// --- Shared fetch helpers -------------------------------------------------

type PageViewRow = {
  session_id: string;
  visitor_id: string;
  is_new_visitor: boolean;
  path: string;
  referrer_host: string | null;
  traffic_category: string;
  utm_campaign: string | null;
  country: string | null;
  created_at: string;
};

async function fetchPageViews(range: DateRange): Promise<PageViewRow[]> {
  const db = createServerDbClient();
  const { gte, lt } = rangeToTimestamps(range);
  const { data, error } = await db
    .from("analytics_page_views")
    .select("session_id, visitor_id, is_new_visitor, path, referrer_host, traffic_category, utm_campaign, country, created_at")
    .gte("created_at", gte)
    .lt("created_at", lt);
  if (error) throw error;
  return data ?? [];
}

async function fetchEvents(range: DateRange, eventType: "button_click" | "contact_click") {
  const db = createServerDbClient();
  const { gte, lt } = rangeToTimestamps(range);
  const { data, error } = await db
    .from("analytics_events")
    .select("event_label, path, created_at")
    .eq("event_type", eventType)
    .gte("created_at", gte)
    .lt("created_at", lt);
  if (error) throw error;
  return data ?? [];
}

async function fetchSearchQueries(range: DateRange) {
  const db = createServerDbClient();
  const { gte, lt } = rangeToTimestamps(range);
  const { data, error } = await db
    .from("analytics_search_queries")
    .select("query, results_count, created_at")
    .gte("created_at", gte)
    .lt("created_at", lt);
  if (error) throw error;
  return data ?? [];
}

async function fetchBotVisits(range: DateRange) {
  const db = createServerDbClient();
  const { gte, lt } = rangeToTimestamps(range);
  const { data, error } = await db
    .from("analytics_bot_visits")
    .select("path, bot_name, bot_category, created_at")
    .gte("created_at", gte)
    .lt("created_at", lt);
  if (error) throw error;
  return data ?? [];
}

async function fetchFormSubmissions(range: DateRange) {
  const db = createServerDbClient();
  const { gte, lt } = rangeToTimestamps(range);
  const { data, error } = await db
    .from("form_submissions")
    .select("id, form_key, page_slug, session_id, created_at")
    .gte("created_at", gte)
    .lt("created_at", lt)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Not date-filtered by design — a submission's session may have started fractionally before the report window, and a session lives 30 minutes, so "any row for this session" is always the right attribution. */
async function getTrafficCategoryForSessions(sessionIds: string[]): Promise<Map<string, string>> {
  if (sessionIds.length === 0) return new Map();
  const db = createServerDbClient();
  const { data, error } = await db.from("analytics_page_views").select("session_id, traffic_category").in("session_id", sessionIds);
  if (error) throw error;
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    if (!map.has(row.session_id)) map.set(row.session_id, row.traffic_category);
  }
  return map;
}

// --- Traffic ---------------------------------------------------------------

export async function getTrafficOverTime(range: DateRange) {
  const rows = await fetchPageViews(range);
  const byDate = new Map<string, { pageViews: number; sessions: Set<string>; visitors: Set<string> }>();
  for (const row of rows) {
    const date = row.created_at.slice(0, 10);
    const bucket = byDate.get(date) ?? { pageViews: 0, sessions: new Set<string>(), visitors: new Set<string>() };
    bucket.pageViews++;
    bucket.sessions.add(row.session_id);
    bucket.visitors.add(row.visitor_id);
    byDate.set(date, bucket);
  }
  return [...byDate.entries()]
    .map(([date, b]) => ({ date, pageViews: b.pageViews, sessions: b.sessions.size, uniqueVisitors: b.visitors.size }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Whole-range distinct totals for the Overview page's KPI tiles — deliberately NOT a sum of getTrafficOverTime's daily buckets, since summing daily unique-session/visitor counts would double-count a session or visitor that appears on more than one day. */
export async function getTrafficSummary(range: DateRange) {
  const rows = await fetchPageViews(range);
  const sessions = new Set<string>();
  const visitors = new Set<string>();
  for (const row of rows) {
    sessions.add(row.session_id);
    visitors.add(row.visitor_id);
  }
  return { totalPageViews: rows.length, totalSessions: sessions.size, totalUniqueVisitors: visitors.size };
}

export async function getTrafficByLocation(range: DateRange) {
  const rows = await fetchPageViews(range);
  const byCountry = new Map<string, { pageViews: number; sessions: Set<string>; visitors: Set<string> }>();
  for (const row of rows) {
    const country = row.country ?? "Unknown";
    const bucket = byCountry.get(country) ?? { pageViews: 0, sessions: new Set<string>(), visitors: new Set<string>() };
    bucket.pageViews++;
    bucket.sessions.add(row.session_id);
    bucket.visitors.add(row.visitor_id);
    byCountry.set(country, bucket);
  }
  return [...byCountry.entries()]
    .map(([country, b]) => ({ country, pageViews: b.pageViews, sessions: b.sessions.size, uniqueVisitors: b.visitors.size }))
    .sort((a, b) => b.sessions - a.sessions);
}

export async function getTrafficByTimeOfDay(range: DateRange) {
  const rows = await fetchPageViews(range);
  const byHour = Array.from({ length: 24 }, () => new Set<string>());
  for (const row of rows) {
    byHour[new Date(row.created_at).getUTCHours()].add(row.session_id);
  }
  return byHour.map((sessions, hour) => ({ hour, sessions: sessions.size }));
}

// --- Behavior ----------------------------------------------------------------

export async function getButtonClicks(range: DateRange) {
  const rows = await fetchEvents(range, "button_click");
  return countByKey(rows, (r) => r.event_label).map(({ key, count }) => ({ label: key, count }));
}

export async function getButtonClicksOverTime(range: DateRange) {
  return seriesByDate(await fetchEvents(range, "button_click"), (r) => r.created_at);
}

export async function getClicksToContactOverTime(range: DateRange) {
  return seriesByDate(await fetchEvents(range, "contact_click"), (r) => r.created_at);
}

export async function getPageVisits(range: DateRange) {
  const rows = await fetchPageViews(range);
  return countByKey(rows, (r) => r.path).map(({ key, count }) => ({ path: key, pageViews: count }));
}

export async function getFormSubmissionsByForm(range: DateRange) {
  const rows = await fetchFormSubmissions(range);
  return countByKey(rows, (r) => r.form_key).map(({ key, count }) => ({ formKey: key, count }));
}

export async function getFormSubmissionsOverTime(range: DateRange) {
  return seriesByDate(await fetchFormSubmissions(range), (r) => r.created_at);
}

export async function getTopSearches(range: DateRange, limit = 20) {
  const rows = await fetchSearchQueries(range);
  return countByKey(rows, (r) => r.query)
    .slice(0, limit)
    .map(({ key, count }) => ({ query: key, count }));
}

export async function getSearchesWithNoResults(range: DateRange, limit = 20) {
  const rows = (await fetchSearchQueries(range)).filter((r) => r.results_count === 0);
  return countByKey(rows, (r) => r.query)
    .slice(0, limit)
    .map(({ key, count }) => ({ query: key, count }));
}

export async function getSearchesOverTime(range: DateRange) {
  return seriesByDate(await fetchSearchQueries(range), (r) => r.created_at);
}

// --- Marketing -----------------------------------------------------------

const TRAFFIC_CATEGORIES = ["direct", "organic", "social", "referral", "paid"] as const;
type TrafficCategoryCounts = Record<(typeof TRAFFIC_CATEGORIES)[number], number>;

function emptyTrafficCategoryCounts(): TrafficCategoryCounts {
  return Object.fromEntries(TRAFFIC_CATEGORIES.map((category) => [category, 0])) as TrafficCategoryCounts;
}

export async function getTrafficCategoriesOverTime(range: DateRange) {
  const rows = await fetchPageViews(range);
  const byDate = new Map<string, TrafficCategoryCounts>();
  for (const row of rows) {
    const date = row.created_at.slice(0, 10);
    const bucket = byDate.get(date) ?? emptyTrafficCategoryCounts();
    const category = row.traffic_category as (typeof TRAFFIC_CATEGORIES)[number];
    bucket[category] = (bucket[category] ?? 0) + 1;
    byDate.set(date, bucket);
  }
  return [...byDate.entries()].map(([date, counts]) => ({ date, ...counts })).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getTopTrafficSources(range: DateRange) {
  const rows = await fetchPageViews(range);
  const bySource = new Map<string, Set<string>>();
  for (const row of rows) {
    const label = trafficSourceLabel(row);
    const sessions = bySource.get(label) ?? new Set<string>();
    sessions.add(row.session_id);
    bySource.set(label, sessions);
  }
  return [...bySource.entries()].map(([source, sessions]) => ({ source, sessions: sessions.size })).sort((a, b) => b.sessions - a.sessions);
}

export async function getFormSubmissionsByTrafficSource(range: DateRange) {
  const submissions = await fetchFormSubmissions(range);
  const sessionIds = [...new Set(submissions.map((s) => s.session_id).filter((id): id is string => Boolean(id)))];
  const categoryBySession = await getTrafficCategoryForSessions(sessionIds);
  const counts = new Map<string, number>();
  for (const submission of submissions) {
    const category = submission.session_id ? (categoryBySession.get(submission.session_id) ?? "unknown") : "unknown";
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return [...counts.entries()].map(([trafficCategory, count]) => ({ trafficCategory, count })).sort((a, b) => b.count - a.count);
}

export async function getPaidCampaignsOverTime(range: DateRange) {
  const rows = (await fetchPageViews(range)).filter((r) => r.traffic_category === "paid");
  return seriesByDate(rows, (r) => r.created_at);
}

export async function getTopPaidCampaigns(range: DateRange) {
  const rows = (await fetchPageViews(range)).filter((r) => r.traffic_category === "paid");
  return countByKey(rows, (r) => r.utm_campaign ?? "(unnamed campaign)").map(({ key, count }) => ({ campaign: key, count }));
}

// --- SEO (bot/AI-crawler detection — Google's own metrics come from
// lib/data/seo-search-console.ts) -------------------------------------------

export async function getBotTrafficOverTime(range: DateRange) {
  return seriesByDate(await fetchBotVisits(range), (r) => r.created_at);
}

export async function getBotVisitsByPage(range: DateRange, limit = 20) {
  const rows = await fetchBotVisits(range);
  return countByKey(rows, (r) => r.path)
    .slice(0, limit)
    .map(({ key, count }) => ({ path: key, count }));
}

export async function getAiBotVisitsByPage(range: DateRange, limit = 20) {
  const rows = (await fetchBotVisits(range)).filter((r) => r.bot_category === "ai_bot");
  return countByKey(rows, (r) => r.path)
    .slice(0, limit)
    .map(({ key, count }) => ({ path: key, count }));
}

export async function getAiBotTrafficOverTime(range: DateRange) {
  const rows = (await fetchBotVisits(range)).filter((r) => r.bot_category === "ai_bot");
  return seriesByDate(rows, (r) => r.created_at);
}

// --- Blog --------------------------------------------------------------------

export async function getTopBlogPosts(range: DateRange, limit = 20) {
  const rows = (await fetchPageViews(range)).filter((r) => isBlogPath(r.path) && r.path !== "/news" && r.path !== "/blog");
  return countByKey(rows, (r) => r.path)
    .slice(0, limit)
    .map(({ key, count }) => ({ path: key, pageViews: count }));
}

export async function getBlogActivityOverTime(range: DateRange) {
  const rows = (await fetchPageViews(range)).filter((r) => isBlogPath(r.path));
  return seriesByDate(rows, (r) => r.created_at);
}

export async function getBlogActivityByTimeOfDay(range: DateRange) {
  const rows = (await fetchPageViews(range)).filter((r) => isBlogPath(r.path));
  return seriesByHour(rows);
}

export async function getBlogTrafficSources(range: DateRange) {
  const rows = (await fetchPageViews(range)).filter((r) => isBlogPath(r.path));
  return countByKey(rows, (r) => trafficSourceLabel(r)).map(({ key, count }) => ({ source: key, pageViews: count }));
}

// --- People --------------------------------------------------------------

export async function getNewVsReturningVisitors(range: DateRange) {
  const rows = await fetchPageViews(range);
  const visitorIsNew = new Map<string, boolean>();
  for (const row of rows) {
    visitorIsNew.set(row.visitor_id, (visitorIsNew.get(row.visitor_id) ?? false) || row.is_new_visitor);
  }
  let newVisitors = 0;
  let returningVisitors = 0;
  for (const isNew of visitorIsNew.values()) {
    if (isNew) newVisitors++;
    else returningVisitors++;
  }
  return { newVisitors, returningVisitors };
}

export async function getContactsOverTime(range: DateRange) {
  return seriesByDate(await fetchFormSubmissions(range), (r) => r.created_at);
}

export async function getFormLeads(range: DateRange, limit = 50) {
  const rows = await fetchFormSubmissions(range);
  return rows.slice(0, limit).map((r) => ({ id: r.id, formKey: r.form_key, pageSlug: r.page_slug, createdAt: r.created_at }));
}

/** Same computation as Marketing's getFormSubmissionsByTrafficSource, surfaced under People's own report name. */
export async function getContactsBySource(range: DateRange) {
  return getFormSubmissionsByTrafficSource(range);
}
