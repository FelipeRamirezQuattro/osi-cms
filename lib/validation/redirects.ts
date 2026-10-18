import { normalizePath } from "@/lib/redirects/matcher";

/**
 * Redirect loop/chain rejection — pure, DB-independent logic so it's directly
 * unit-testable (see redirects.test.ts). The caller (lib/actions/entities.ts's
 * saveEntityAction, special-cased for the `redirects` entity) supplies the
 * candidate row plus every *other* existing redirect row; this never touches the
 * database itself.
 *
 * The table is kept FLAT: no redirect may point at another redirect's source,
 * and no redirect may be pointed at by one. A crawler then always reaches the
 * final page in a single 301 (proxy.ts also flattens at runtime as a safety net,
 * and publish_page_atomic repoints rows on a slug change — migration 0050).
 * Each message names the conflicting row so the editor knows exactly what to fix.
 */

export type RedirectEdge = { id: string; from_path: string; to_path: string };

export type RedirectCandidate = { id?: string; from_path: string; to_path: string };

const same = (a: string, b: string) => normalizePath(a).toLowerCase() === normalizePath(b).toLowerCase();

/**
 * Returns a user-facing error message if saving `candidate` would create a
 * self-loop, a loop, or a chain with an existing redirect — `null` if it's fine.
 *
 * `existing` should be every other redirect row (the row being edited, if any, is
 * excluded via `candidate.id` so a no-op edit doesn't conflict with its own prior value).
 */
export function findRedirectChainIssue(candidate: RedirectCandidate, existing: RedirectEdge[]): string | null {
  const { from_path: from, to_path: to } = candidate;

  if (same(from, to)) {
    return "A redirect can't point to itself — \"From\" and \"To\" are the same path.";
  }

  const others = existing.filter((edge) => edge.id !== candidate.id);

  // A -> B while B already redirects somewhere: this would be a chain (or a loop).
  const next = others.find((edge) => same(edge.from_path, to));
  if (next) {
    return same(next.to_path, from)
      ? `${next.from_path} already redirects back to ${next.to_path} — this would create a loop.`
      : `${next.from_path} already redirects to ${next.to_path} — point this one straight to ${next.to_path}.`;
  }

  // X -> A while A is about to redirect: the new row would put A in the middle of a chain.
  const previous = others.find((edge) => same(edge.to_path, from));
  if (previous) {
    return `${previous.from_path} already redirects to ${previous.to_path} — point that redirect straight to ${to} first, otherwise ${previous.from_path} → ${from} → ${to} would be a chain.`;
  }

  return null;
}
