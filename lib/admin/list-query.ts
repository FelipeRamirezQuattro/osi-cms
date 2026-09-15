/**
 * Pure, framework-agnostic search/filter/sort/pagination helpers shared by
 * every admin list screen (Task 13a). Deliberately has no dependency on
 * `next/navigation` or React — `components/admin/ui/use-list-query-state.ts`
 * is the thin client-side hook that reads/writes the URL and calls into
 * these; keeping the actual row-shuffling logic here makes it trivially
 * unit-testable without mocking a router.
 *
 * These operate on already-fetched, in-memory arrays (not a server-side
 * range query) — see docs/DECISIONS.md for why: current admin tables run
 * tens of rows, not thousands, so a real range query is disproportionate
 * scope for this task.
 */

export type SortDirection = "asc" | "desc";

export const DEFAULT_PAGE_SIZE = 20;

/** Reads `q`/`status`/`sort`/`dir`/`page` off any string-keyed param bag (a `URLSearchParams` or a plain object both work). */
export function readParam(params: URLSearchParams | Record<string, string | undefined>, key: string): string {
  if (params instanceof URLSearchParams) return params.get(key) ?? "";
  return params[key] ?? "";
}

/** Case-insensitive substring filter over a caller-supplied searchable text projection of each row. */
export function filterBySearch<T>(rows: T[], query: string, getText: (row: T) => string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => getText(row).toLowerCase().includes(q));
}

/** Exact-match filter on a status-like field; `status === ""` (the "All statuses" option) is a no-op. */
export function filterByStatus<T>(rows: T[], status: string, getStatus: (row: T) => string | null | undefined): T[] {
  if (!status) return rows;
  return rows.filter((row) => (getStatus(row) ?? "") === status);
}

/**
 * Stable sort by a caller-supplied comparable projection. Nullish values
 * always sort to the end regardless of direction (missing data reads as
 * "least relevant", not as smallest/biggest). String values compare
 * case-insensitively — every real caller is a "Title A-Z" style admin
 * sort, where an admin typing lowercase titles ending up in their own
 * separate block after every uppercase-first title would read as broken.
 */
export function sortRows<T>(rows: T[], getValue: (row: T) => string | number | null | undefined, direction: SortDirection = "asc"): T[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    const av = getValue(a);
    const bv = getValue(b);
    const aNil = av === null || av === undefined;
    const bNil = bv === null || bv === undefined;
    if (aNil && bNil) return 0;
    if (aNil) return 1;
    if (bNil) return -1;
    const na = typeof av === "string" ? av.toLowerCase() : av;
    const nb = typeof bv === "string" ? bv.toLowerCase() : bv;
    if (na === nb) return 0;
    const cmp = na < nb ? -1 : 1;
    return direction === "asc" ? cmp : -cmp;
  });
  return copy;
}

export type PaginationResult<T> = {
  rows: T[];
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
};

/** Clamps `page` into `[1, totalPages]` before slicing, so an out-of-range URL (`?page=999`) degrades to the last page instead of an empty table. */
export function paginate<T>(rows: T[], page: number, pageSize: number = DEFAULT_PAGE_SIZE): PaginationResult<T> {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Number.isFinite(page) && page > 0 ? Math.min(Math.floor(page), totalPages) : 1;
  const start = (safePage - 1) * pageSize;
  return { rows: rows.slice(start, start + pageSize), page: safePage, totalPages, total, pageSize };
}
