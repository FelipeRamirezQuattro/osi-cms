"use client";

import { useEffect, useState } from "react";
import type { SortDirection } from "@/lib/admin/list-query";

export type SortOption = { value: string; label: string; direction: SortDirection };

/**
 * The reusable search + status filter + sort + pagination toolbar every
 * admin list screen renders above its `AdminDataTable` (Task 13a, brief
 * item 2) — pass it as `AdminDataTable`'s `toolbar` prop. Purely
 * presentational and controlled: all state lives in the caller's
 * `useListQueryState()` call, so this component has no direct
 * `next/navigation` dependency and is trivial to render-test.
 *
 * The search input debounces locally (250ms) before calling `onSearchChange`
 * — typing fires a `router.replace` per commit, not per keystroke, since
 * `useListQueryState` writes straight to the URL.
 */
export function AdminListControls({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search…",
  statusValue,
  onStatusChange,
  statusOptions,
  sortValue,
  sortDirection,
  onSortChange,
  sortOptions,
  page,
  totalPages,
  onPageChange,
  resultCount,
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  statusValue?: string;
  onStatusChange?: (value: string) => void;
  statusOptions?: string[];
  sortValue?: string;
  sortDirection?: SortDirection;
  onSortChange?: (value: string, direction: SortDirection) => void;
  sortOptions?: SortOption[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  resultCount: number;
}) {
  const [draft, setDraft] = useState(searchValue);
  // Keep the input in sync if the URL changes from outside this component
  // (browser back/forward, or a "Clear filters" link elsewhere on the
  // page) — adjusted during render (React's documented pattern for
  // "reset state when a prop changes") rather than an effect, which would
  // set state synchronously on every mount/prop-change and trip the
  // cascading-render lint rule for no benefit over branching here.
  const [prevSearchValue, setPrevSearchValue] = useState(searchValue);
  if (searchValue !== prevSearchValue) {
    setPrevSearchValue(searchValue);
    setDraft(searchValue);
  }

  useEffect(() => {
    if (draft === searchValue) return;
    const timeout = setTimeout(() => onSearchChange(draft), 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the debounce timer should re-run on `draft` changes
  }, [draft]);

  const sortCompoundValue = sortValue ? `${sortValue}:${sortDirection ?? "asc"}` : "";

  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-osi-sand-300 bg-osi-cream-100/60 px-4 py-3 text-sm">
      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-wide-label opacity-60">Search</span>
        <input
          type="search"
          inputMode="search"
          autoComplete="off"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-48 rounded border border-osi-sand-300 px-2 py-1.5"
        />
      </label>

      {statusOptions && onStatusChange && (
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide-label opacity-60">Status</span>
          <select
            value={statusValue ?? ""}
            onChange={(e) => onStatusChange(e.target.value)}
            className="rounded border border-osi-sand-300 px-2 py-1.5"
          >
            <option value="">All statuses</option>
            {statusOptions.map((option) => (
              <option key={option} value={option} className="capitalize">
                {option}
              </option>
            ))}
          </select>
        </label>
      )}

      {sortOptions && sortOptions.length > 0 && onSortChange && (
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide-label opacity-60">Sort</span>
          <select
            value={sortCompoundValue}
            onChange={(e) => {
              const [value, direction] = e.target.value.split(":");
              onSortChange(value, direction === "desc" ? "desc" : "asc");
            }}
            className="rounded border border-osi-sand-300 px-2 py-1.5"
          >
            <option value="">Default order</option>
            {sortOptions.map((option) => (
              <option key={`${option.value}:${option.direction}`} value={`${option.value}:${option.direction}`}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="ml-auto flex items-center gap-3 text-xs opacity-70">
        <span>
          {resultCount} result{resultCount === 1 ? "" : "s"}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="rounded border border-osi-sand-300 px-2 py-1 uppercase tracking-wide-label disabled:opacity-40"
            >
              Prev
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="rounded border border-osi-sand-300 px-2 py-1 uppercase tracking-wide-label disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
