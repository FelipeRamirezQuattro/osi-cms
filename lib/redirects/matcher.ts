/**
 * Pure matcher for the `redirects` table, used by proxy.ts so a legacy URL gets
 * a real HTTP 301/302/307/308 + Location *before* any page renders (the
 * catch-all page's redirect() could only ever stream a 200 plus a client-side
 * 308 — see the soft-404 comment in proxy.ts and docs/DECISIONS.md).
 *
 * No I/O here: the caller supplies the rows (lib/data/redirects.ts caches them).
 */

export type RedirectRow = { from_path: string; to_path: string; status_code: number };

type Entry = { to: string; status: number };

export type RedirectIndex = {
  /** Exact (case-sensitive) from_path → entry, trailing slash removed. */
  exact: Map<string, Entry>;
  /** Lower-cased from_path → entry. Wix URLs aren't case-sensitive (e.g. /Osidirectory). */
  lower: Map<string, Entry>;
};

export type RedirectMatch = { location: string; status: number };

/** Safety net only — the admin and the publish RPC keep the table flat; this just flattens whatever slips through. */
const MAX_FOLLOW_HOPS = 5;

export function normalizePath(path: string): string {
  let p = path;
  try {
    p = decodeURI(p);
  } catch {
    /* keep the raw path */
  }
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p === "" ? "/" : p;
}

export function buildRedirectIndex(rows: readonly RedirectRow[]): RedirectIndex {
  const exact = new Map<string, Entry>();
  const lower = new Map<string, Entry>();
  for (const row of rows) {
    const from = normalizePath(row.from_path);
    const entry = { to: row.to_path, status: row.status_code };
    exact.set(from, entry);
    // First writer wins on a case-insensitive collision, so the result doesn't depend on row order luck.
    if (!lower.has(from.toLowerCase())) lower.set(from.toLowerCase(), entry);
  }
  return { exact, lower };
}

function lookup(index: RedirectIndex, path: string): Entry | undefined {
  const p = normalizePath(path);
  return index.exact.get(p) ?? index.lower.get(p.toLowerCase());
}

function isAbsolute(target: string): boolean {
  return /^https?:\/\//i.test(target);
}

function withQuery(target: string, search: string): string {
  if (!search || search === "?") return target;
  const incoming = new URLSearchParams(search);
  const hashIndex = target.indexOf("#");
  const hash = hashIndex === -1 ? "" : target.slice(hashIndex);
  const beforeHash = hashIndex === -1 ? target : target.slice(0, hashIndex);
  const queryIndex = beforeHash.indexOf("?");
  const base = queryIndex === -1 ? beforeHash : beforeHash.slice(0, queryIndex);
  const own = new URLSearchParams(queryIndex === -1 ? "" : beforeHash.slice(queryIndex + 1));
  // The destination's own params win on a conflict; everything else the visitor sent is kept.
  for (const [key, value] of incoming) if (!own.has(key)) own.append(key, value);
  const query = own.toString();
  return `${base}${query ? `?${query}` : ""}${hash}`;
}

/**
 * Resolves `pathname` (+ `search`, with or without the leading "?") to its final
 * destination in one hop. Returns null when no redirect applies, or when the rows
 * form a loop (the request is then left to the normal routing instead of looping).
 */
export function matchRedirect(index: RedirectIndex, pathname: string, search = ""): RedirectMatch | null {
  const first = lookup(index, pathname);
  if (!first) return null;

  const seen = new Set<string>([normalizePath(pathname).toLowerCase()]);
  let target = first.to;
  for (let hops = 0; hops < MAX_FOLLOW_HOPS; hops++) {
    if (isAbsolute(target)) break;
    const targetPath = target.split(/[?#]/)[0];
    const key = normalizePath(targetPath).toLowerCase();
    const next = lookup(index, targetPath);
    if (!next) break;
    if (seen.has(key)) return null; // loop
    seen.add(key);
    // Keep the destination's own query/hash when flattening A -> B?x=1 -> C.
    target = next.to;
    if (hops === MAX_FOLLOW_HOPS - 1) return null; // still chaining after the cap: refuse rather than guess
  }

  const own = target.split(/[?#]/)[0];
  if (!isAbsolute(target) && normalizePath(own).toLowerCase() === normalizePath(pathname).toLowerCase()) return null;
  return { location: withQuery(target, search), status: first.status };
}
