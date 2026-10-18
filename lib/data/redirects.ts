import { createProxyDbClient } from "@/lib/db/client";
import { buildRedirectIndex, matchRedirect, type RedirectIndex } from "@/lib/redirects/matcher";
import { resolveRedirectTarget } from "@/lib/redirects/resolver";

/**
 * The whole `redirects` table (tiny — a few dozen rows) as a lookup index, for
 * proxy.ts. Product/page targets are resolved here, from the status, category and
 * slug that `redirect_index()` (migration 0052) returns in the same single query —
 * so a publish or a category change is picked up on the next refresh, never per
 * request. Cached in module memory for REDIRECT_CACHE_TTL_MS, so a warm instance
 * costs one query a minute instead of one per request; an admin edit or a publish
 * therefore takes up to a minute to apply.
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
    const { data, error } = await db.rpc("redirect_index").abortSignal(AbortSignal.timeout(REDIRECT_FETCH_TIMEOUT_MS));
    if (!error && data) {
      return buildRedirectIndex(
        data.map((row) => ({ from_path: row.from_path, to_path: resolveRedirectTarget(row), status_code: row.status_code })),
      );
    }
    // Migration 0052 not applied yet (or the RPC failed): plain path redirects still work.
    const plain = await db
      .from("redirects")
      .select("from_path, to_path, status_code")
      .abortSignal(AbortSignal.timeout(REDIRECT_FETCH_TIMEOUT_MS));
    if (plain.error || !plain.data) return null;
    return buildRedirectIndex(
      plain.data.flatMap((row) => (row.to_path ? [{ from_path: row.from_path, to_path: row.to_path, status_code: row.status_code }] : [])),
    );
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

/**
 * The resolved redirect for a path, for the catch-all page's fallback (a path the proxy
 * couldn't answer, e.g. the index was unavailable at that moment). Same resolution as the proxy.
 */
export async function getRedirectByPath(fromPath: string): Promise<{ to_path: string; status_code: number } | null> {
  const index = await getRedirectIndex();
  const hit = index ? matchRedirect(index, fromPath) : null;
  return hit ? { to_path: hit.location, status_code: hit.status } : null;
}
