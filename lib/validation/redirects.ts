/**
 * Task 15: redirect loop/chain rejection — pure, DB-independent logic so
 * it's directly unit-testable (see redirects.test.ts). The caller
 * (lib/actions/entities.ts's saveEntityAction, special-cased for the
 * `redirects` entity) supplies the candidate row plus every *other*
 * existing redirect row; this never touches the database itself.
 *
 * `MAX_REDIRECT_CHAIN_HOPS = 3` is this task's "agreed limit" (the brief
 * left the exact number to the implementer) — chosen because a real
 * browser/crawler chain of 3 redirects (A -> B -> C -> D) is already at
 * the edge of what most crawlers/CDNs will follow before giving up, and
 * because the legacy site being migrated (content/legacy/) never had
 * more than one redirect hop for any URL. A page that's been renamed 4
 * times without anyone cleaning up the old redirects is a sign the
 * redirect table itself needs tidying, not a case to silently support
 * forever.
 *
 * This only walks the chain *forward* from the candidate's own to_path —
 * it does not search for some other, unrelated existing redirect whose
 * chain would be pushed over the limit by this new row landing in the
 * middle of it. That's a deliberate scope limit (see docs/DECISIONS.md):
 * checking every existing redirect's chain on every save is unbounded
 * work as the table grows, whereas checking the one row being saved is
 * O(existing redirects) and catches the common real-world case (an
 * editor extending a chain they can see, one hop at a time).
 */

export type RedirectEdge = { id: string; from_path: string; to_path: string };

export const MAX_REDIRECT_CHAIN_HOPS = 3;

export type RedirectCandidate = { id?: string; from_path: string; to_path: string };

/**
 * Returns a user-facing error message if saving `candidate` would create
 * a self-loop, a multi-hop loop with existing redirects, or a resolution
 * chain longer than `maxHops` — `null` if the redirect is fine to save.
 *
 * `existing` should be every other redirect row in the table (the row
 * being edited, if any, is excluded via `candidate.id` so a no-op edit
 * doesn't "loop" against its own prior value).
 */
export function findRedirectChainIssue(
  candidate: RedirectCandidate,
  existing: RedirectEdge[],
  maxHops: number = MAX_REDIRECT_CHAIN_HOPS,
): string | null {
  const from = candidate.from_path;
  const to = candidate.to_path;

  if (from === to) {
    return "A redirect can't point to itself — \"From\" and \"To\" are the same path.";
  }

  const byFrom = new Map(
    existing.filter((edge) => edge.id !== candidate.id).map((edge) => [edge.from_path, edge.to_path]),
  );

  const visited = new Set<string>([from]);
  let current = to;
  let hops = 1; // the candidate redirect itself is the first hop (from -> to)

  while (byFrom.has(current)) {
    if (hops >= maxHops) {
      return `This redirect would chain more than ${maxHops} hops deep (via ${current}) — simplify the existing chain first.`;
    }
    if (visited.has(current)) {
      return "This redirect would create a loop with existing redirects.";
    }
    visited.add(current);
    current = byFrom.get(current)!;
    hops += 1;
    if (current === from) {
      return "This redirect would create a loop with existing redirects.";
    }
  }

  return null;
}
