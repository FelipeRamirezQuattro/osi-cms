/**
 * Search-engine indexing policy. Pure (no Next imports) so the proxy, the
 * robots/sitemap routes and the unit tests share one definition.
 *
 * A deployment is indexable only when BOTH hold:
 *   1. `SITE_INDEXABLE=true` (the launch switch — set it in Vercel, no code change), and
 *   2. the request host is the production domain.
 * The host check is the safety net: a preview deployment or the review
 * address can never be indexed, even if the env var leaks to it.
 */

export const PRODUCTION_HOST = "odessaseparator.com";
export const PRODUCTION_ORIGIN = `https://${PRODUCTION_HOST}`;
export const INDEXABLE_HOSTS: readonly string[] = [PRODUCTION_HOST, `www.${PRODUCTION_HOST}`];
/** The review address. After go-live it 301s to the production domain. */
export const REVIEW_HOST = "osi-cms.vercel.app";
export const NOINDEX_DIRECTIVE = "noindex, nofollow";

type Env = Record<string, string | undefined>;

/** Lower-cases and strips the port; first value of a comma-separated forwarded list. */
export function normalizeHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const first = host.split(",")[0]?.trim().toLowerCase();
  if (!first) return null;
  return first.replace(/:\d+$/, "");
}

export function isIndexableHost(host: string | null | undefined): boolean {
  const normalized = normalizeHost(host);
  return normalized !== null && INDEXABLE_HOSTS.includes(normalized);
}

/** The env half of the policy only (used where no request host is available, e.g. static metadata). */
export function isIndexingEnabled(env: Env = process.env): boolean {
  return env.SITE_INDEXABLE === "true";
}

/** Full policy: env switch AND production host. An unknown host is never indexable. */
export function isSiteIndexable(host: string | null | undefined, env: Env = process.env): boolean {
  return isIndexingEnabled(env) && isIndexableHost(host);
}

/**
 * Where the review address should 301 to, or null. Only the exact review host
 * is redirected (never `*-git-*.vercel.app` or `*-<hash>.vercel.app` previews),
 * and only once `REVIEW_HOST_REDIRECT=true`.
 */
export function reviewHostRedirectTarget(
  host: string | null | undefined,
  pathAndSearch: string,
  env: Env = process.env,
): string | null {
  if (env.REVIEW_HOST_REDIRECT !== "true") return null;
  if (normalizeHost(host) !== REVIEW_HOST) return null;
  return `${PRODUCTION_ORIGIN}${pathAndSearch}`;
}
