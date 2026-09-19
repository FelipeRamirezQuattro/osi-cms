import { createServerDbClient, createServiceRoleDbClient } from "@/lib/db/client";
import type { TablesInsert } from "@/lib/db/database.types";

/**
 * Public-write analytics tables (see supabase/migrations/0037) — every
 * insert here is reachable by an anonymous visitor's browser (or, for
 * recordBotVisit, by proxy.ts on their behalf), so this file never reads
 * any of them back with the anon client. Reads belong to
 * lib/data/analytics-reports.ts (Phase 8c, staff-only).
 */

export async function recordPageview(row: TablesInsert<"analytics_page_views">): Promise<void> {
  const db = createServerDbClient();
  const { error } = await db.from("analytics_page_views").insert(row);
  if (error) throw error;
}

export async function recordAnalyticsEvent(row: TablesInsert<"analytics_events">): Promise<void> {
  const db = createServerDbClient();
  const { error } = await db.from("analytics_events").insert(row);
  if (error) throw error;
}

export async function recordSearchQuery(row: TablesInsert<"analytics_search_queries">): Promise<void> {
  const db = createServerDbClient();
  const { error } = await db.from("analytics_search_queries").insert(row);
  if (error) throw error;
}

export async function recordBotVisit(row: TablesInsert<"analytics_bot_visits">): Promise<void> {
  const db = createServerDbClient();
  const { error } = await db.from("analytics_bot_visits").insert(row);
  if (error) throw error;
}

/**
 * Rate limit for the public beacon endpoint — same reasoning as
 * countRecentSubmissionsByIp (lib/data/forms.ts): RLS grants SELECT on
 * these tables to staff only, so an anon-key client would silently read
 * back zero rows and the limit would never trigger. Counts page views
 * and events together since both land through the same endpoint; the
 * threshold is far higher than the contact form's (a real visitor
 * legitimately generates many rows per session browsing + clicking).
 */
export async function countRecentAnalyticsWritesByIp(ipHash: string, windowMinutes: number): Promise<number> {
  const db = createServiceRoleDbClient();
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();

  const [pageViews, events] = await Promise.all([
    db.from("analytics_page_views").select("*", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", since),
    db.from("analytics_events").select("*", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", since),
  ]);

  if (pageViews.error) throw pageViews.error;
  if (events.error) throw events.error;

  return (pageViews.count ?? 0) + (events.count ?? 0);
}
