"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { SortDirection } from "@/lib/admin/list-query";

export type ListQueryState = {
  q: string;
  status: string;
  sort: string;
  direction: SortDirection;
  page: number;
  setQuery: (value: string) => void;
  setStatus: (value: string) => void;
  setSort: (value: string, direction?: SortDirection) => void;
  setPage: (value: number) => void;
};

/**
 * The one reusable "search/filter/sort/pagination lives in the URL" hook
 * behind every admin list screen (Task 13a, brief item 2). Every write goes
 * through `router.replace` (never `push`, so filtering doesn't pollute
 * back/forward history) with `scroll: false`, which is what makes the
 * resulting state survive a refresh and stay bookmarkable/shareable without
 * a server round-trip — these tables filter an already-fetched, in-memory
 * array (see lib/admin/list-query.ts's top comment for why), so a URL
 * change here only needs to re-run client-side filtering, not re-fetch.
 *
 * Changing `q` or `status` resets `page` back to 1 (a stale page number
 * from a wider result set would otherwise silently show an empty table);
 * changing `sort`/`page` themselves does not.
 */
export function useListQueryState(defaultSort = ""): ListQueryState {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();

  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const sort = searchParams.get("sort") ?? defaultSort;
  const direction: SortDirection = searchParams.get("dir") === "desc" ? "desc" : "asc";
  const pageParam = Number(searchParams.get("page"));
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;

  const update = useCallback(
    (patch: Record<string, string | null>, resetPage: boolean) => {
      const params = new URLSearchParams(searchParamsString);
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      if (resetPage) params.delete("page");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParamsString],
  );

  return useMemo(
    () => ({
      q,
      status,
      sort,
      direction,
      page,
      setQuery: (value: string) => update({ q: value }, true),
      setStatus: (value: string) => update({ status: value }, true),
      setSort: (value: string, dir?: SortDirection) => update({ sort: value || null, dir: dir ?? null }, false),
      setPage: (value: number) => update({ page: value > 1 ? String(value) : null }, false),
    }),
    [q, status, sort, direction, page, update],
  );
}
