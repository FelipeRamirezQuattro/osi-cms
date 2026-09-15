"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { Tables } from "@/lib/db/database.types";
import { filterByStatus, filterBySearch, paginate, sortRows } from "@/lib/admin/list-query";
import { AdminPageHeader, AdminNewLinkButton } from "@/components/admin/ui/admin-page-header";
import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/ui/admin-data-table";
import { AdminListControls, type SortOption } from "@/components/admin/ui/admin-list-controls";
import { useListQueryState } from "@/components/admin/ui/use-list-query-state";
import { StatusBadge } from "@/components/admin/ui/status-badge";

type PageRow = Tables<"pages">;

const SORT_OPTIONS: SortOption[] = [
  { value: "title", label: "Title A-Z", direction: "asc" },
  { value: "title", label: "Title Z-A", direction: "desc" },
  { value: "updated_at", label: "Recently updated", direction: "desc" },
  { value: "updated_at", label: "Oldest updated", direction: "asc" },
];

const columns: AdminDataTableColumn<PageRow>[] = [
  {
    key: "title",
    header: "Title",
    render: (page) => (
      <>
        <Link href={`/admin/pages/${page.id}`} className="font-medium hover:underline">
          {page.title}
        </Link>
        {page.is_system && <span className="ml-2 text-[10px] uppercase tracking-wide-label opacity-50">system</span>}
      </>
    ),
  },
  { key: "slug", header: "Slug", render: (page) => <span className="opacity-70">/{page.slug}</span> },
  { key: "template", header: "Template", render: (page) => <span className="opacity-70">{page.template}</span> },
  { key: "status", header: "Status", render: (page) => <StatusBadge label={page.status} /> },
  {
    key: "updated_at",
    header: "Updated",
    render: (page) => <span className="opacity-50">{new Date(page.updated_at).toLocaleDateString()}</span>,
  },
];

/** Search/filter/sort/pagination list (Task 13a) — split out of pages/page.tsx (a Server Component) since URL-backed state needs `next/navigation` hooks. */
export function PagesList({ pages }: { pages: PageRow[] }) {
  const query = useListQueryState();

  const filtered = useMemo(() => {
    let rows = filterBySearch(pages, query.q, (page) => `${page.title} ${page.slug}`);
    rows = filterByStatus(rows, query.status, (page) => page.status);
    if (query.sort) rows = sortRows(rows, (page) => page[query.sort as keyof PageRow] as string | number | null, query.direction);
    return rows;
  }, [pages, query.q, query.status, query.sort, query.direction]);

  const { rows: pageRows, totalPages } = paginate(filtered, query.page);

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Pages" actions={<AdminNewLinkButton href="/admin/pages/new">New page</AdminNewLinkButton>} />

      <AdminDataTable
        columns={columns}
        rows={pageRows}
        getRowKey={(page) => page.id}
        emptyMessage={pages.length === 0 ? "No pages yet." : "No results match these filters."}
        toolbar={
          <AdminListControls
            searchValue={query.q}
            onSearchChange={query.setQuery}
            searchPlaceholder="Search pages…"
            statusValue={query.status}
            onStatusChange={query.setStatus}
            statusOptions={["draft", "published"]}
            sortValue={query.sort}
            sortDirection={query.direction}
            onSortChange={query.setSort}
            sortOptions={SORT_OPTIONS}
            page={query.page}
            totalPages={totalPages}
            onPageChange={query.setPage}
            resultCount={filtered.length}
          />
        }
      />
    </div>
  );
}
