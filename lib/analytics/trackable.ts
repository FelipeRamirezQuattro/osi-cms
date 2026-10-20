/**
 * Server-side guard for what the collect endpoint will record. The beacon
 * already skips /preview/ on the client, but the endpoint is public, so it
 * must not trust the client: staff areas and non-site paths are never
 * counted, whatever a request claims.
 */
const EXCLUDED_PREFIXES = ["/admin", "/preview", "/api", "/_next", "/styleguide", "/branding-preview", "/system-not-found"];
export const MAX_PATH_LENGTH = 300;

export function isTrackablePath(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//") || path.length > MAX_PATH_LENGTH) return false;
  const lower = path.toLowerCase();
  return !EXCLUDED_PREFIXES.some((prefix) => lower === prefix || lower.startsWith(`${prefix}/`) || lower.startsWith(`${prefix}?`));
}
