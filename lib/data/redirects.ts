import { createProxyDbClient, createServerDbClient } from "@/lib/db/client";
import { buildRedirectIndex, type RedirectIndex } from "@/lib/redirects/matcher";
import type { Tables } from "@/lib/db/database.types";

/**
 * Resolves the `redirects` table (legacy URL map, master prompt §7/§9)
 * against the catch-all route — checked only when no `pages` row matches
 * the slug, so a real CMS page always wins over a stale redirect entry.
 */
export async function getRedirectByPath(fromPath: string): Promise<Tables<"redirects"> | null> {
  const db = createServerDbClient();
  const { data, error } = await db.from("redirects").select("*").eq("from_path", fromPath).maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * The whole `redirects` table (tiny — a few dozen rows) as a lookup index, for
 * proxy.ts. Cached in module memory for REDIRECT_CACHE_TTL_MS so a warm instance
 * costs one query a minute instead of one per request; an admin edit therefore
 * takes up to a minute to apply.
 *
 * The cache is an optimisation only (Next's proxy docs say not to rely on
 * globals there): a cold or different instance simply fetches again. It fails
 * open — on an error or a 1.5s timeout it serves the last good copy, or `null`
 * (no redirects known: the request falls through to the catch-all page, which
 * still redirects, just client-side). It never throws into the proxy.
 */
export const REDIRECT_CACHE_TTL_MS = 60_000;
const REDIRECT_FETCH_TIMEOUT_MS = 1_500;

let cached: { index: RedirectIndex; fetchedAt: number } | null = null;
let inflight: Promise<RedirectIndex | null> | null = null;

export function resetRedirectCacheForTests() {
  cached = null;
  inflight = null;
}

async function fetchRedirectIndex(): Promise<RedirectIndex | null> {
  try {
    const db = createProxyDbClient();
    const { data, error } = await db
      .from("redirects")
      .select("from_path, to_path, status_code")
      .abortSignal(AbortSignal.timeout(REDIRECT_FETCH_TIMEOUT_MS));
    if (error || !data) return null;
    return buildRedirectIndex(data);
  } catch {
    return null;
  }
}

export async function getRedirectIndex(now: number = Date.now()): Promise<RedirectIndex | null> {
  if (cached && now - cached.fetchedAt < REDIRECT_CACHE_TTL_MS) return cached.index;
  // Concurrent requests during a refresh share one query.
  inflight ??= fetchRedirectIndex().finally(() => {
    inflight = null;
  });
  const fresh = await inflight;
  if (fresh) {
    cached = { index: fresh, fetchedAt: now };
    return fresh;
  }
  return cached?.index ?? null; // stale-on-error
}
