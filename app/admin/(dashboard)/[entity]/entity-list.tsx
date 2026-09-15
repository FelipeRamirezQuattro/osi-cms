"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useTransition } from "react";
import type { EntityConfig, EntityKey } from "@/lib/admin/entity-config";
import { deleteEntityAction, moveEntityAction } from "@/lib/actions/entities";
import { hasCapability } from "@/lib/auth/capabilities";
import type { AdminRole } from "@/lib/auth";
import type { EntityRow } from "@/lib/data/admin-entities";
import { filterByStatus, filterBySearch, paginate, sortRows } from "@/lib/admin/list-query";
import { AdminPageHeader, AdminNewLinkButton } from "@/components/admin/ui/admin-page-header";
import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/ui/admin-data-table";
import { AdminListControls, type SortOption } from "@/components/admin/ui/admin-list-controls";
import { useListQueryState } from "@/components/admin/ui/use-list-query-state";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { ReorderButtons, RowActionButton } from "@/components/admin/ui/row-actions";
import { useConfirmDialog } from "@/components/admin/ui/confirm-dialog";

export function EntityList({
  entity,
  config,
  initialRows,
  role,
}: {
  entity: EntityKey;
  config: EntityConfig;
  initialRows: EntityRow[];
  role: AdminRole;
}) {
  const canDelete = hasCapability(role, "delete_content");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirmDialog();
  const query = useListQueryState();

  const positionById = useMemo(() => new Map(initialRows.map((row, index) => [row.id, index])), [initialRows]);

  const sortOptions: SortOption[] = config.listColumns.flatMap((col) => [
    { value: col.key, label: `${col.label} A-Z`, direction: "asc" as const },
    { value: col.key, label: `${col.label} Z-A`, direction: "desc" as const },
  ]);

  const filtersActive = query.q !== "" || query.status !== "" || query.sort !== "";

  const filtered = useMemo(() => {
    let rows = filterBySearch(initialRows, query.q, (row) =>
      config.listColumns.map((col) => String(row[col.key] ?? "")).join(" "),
    );
    rows = filterByStatus(rows, query.status, (row) => (config.hasStatus ? String(row.status ?? "") : undefined));
    if (query.sort) rows = sortRows(rows, (row) => String(row[query.sort] ?? ""), query.direction);
    return rows;
  }, [initialRows, query.q, query.status, query.sort, query.direction, config.listColumns, config.hasStatus]);

  const { rows: pageRows, totalPages } = paginate(filtered, query.page);

  function move(id: string, direction: "up" | "down") {
    startTransition(async () => {
      await moveEntityAction(entity, id, direction);
      router.refresh();
    });
  }

  async function remove(row: EntityRow) {
    const ok = await confirm({
      title: `Delete this ${config.label.toLowerCase()}?`,
      message: "This cannot be undone.",
      tone: "danger",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    startTransition(async () => {
      // A successful delete redirects server-side and never resolves this
      // promise with a value — only the error path (e.g. the
      // product-categories change-impact guard) returns here.
      const result = await deleteEntityAction(entity, row.id);
      if (result?.status === "error") {
        window.alert(result.message);
      }
    });
  }

  const columns: AdminDataTableColumn<EntityRow>[] = [
    ...config.listColumns.map((col, colIndex) => ({
      key: col.key,
      header: col.label,
      render: (row: EntityRow) =>
        colIndex === 0 ? (
          <Link href={`/admin/${entity}/${row.id}`} className="font-medium hover:underline">
            {String(row[col.key] ?? "")}
          </Link>
        ) : (
          <span className="opacity-70">{String(row[col.key] ?? "")}</span>
        ),
    })),
    ...(config.hasStatus
      ? [
          {
            key: "status",
            header: "Status",
            render: (row: EntityRow) => <StatusBadge label={String(row.status)} />,
          },
        ]
      : []),
    ...(config.hasPosition
      ? [
          {
            key: "order",
            header: "Order",
            render: (row: EntityRow) =>
              filtersActive ? (
                <span className="text-xs opacity-40" title="Clear search/filter/sort to reorder">
                  —
                </span>
              ) : (
                <ReorderButtons
                  onMoveUp={() => move(row.id, "up")}
                  onMoveDown={() => move(row.id, "down")}
                  disabled={isPending}
                  disableUp={(positionById.get(row.id) ?? 0) === 0}
                  disableDown={(positionById.get(row.id) ?? 0) === initialRows.length - 1}
                />
              ),
          },
        ]
      : []),
    {
      key: "actions",
      header: "",
      cellClassName: "text-right",
      render: (row: EntityRow) =>
        canDelete && (
          <RowActionButton onClick={() => remove(row)} disabled={isPending} tone="danger">
            Delete
          </RowActionButton>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={config.pluralLabel}
        actions={<AdminNewLinkButton href={`/admin/${entity}/new`}>New {config.label.toLowerCase()}</AdminNewLinkButton>}
      />

      <AdminDataTable
        columns={columns}
        rows={pageRows}
        getRowKey={(row) => row.id}
        emptyMessage={
          initialRows.length === 0 ? `No ${config.pluralLabel.toLowerCase()} yet.` : "No results match these filters."
        }
        toolbar={
          <AdminListControls
            searchValue={query.q}
            onSearchChange={query.setQuery}
            searchPlaceholder={`Search ${config.pluralLabel.toLowerCase()}…`}
            statusValue={query.status}
            onStatusChange={config.hasStatus ? query.setStatus : undefined}
            statusOptions={config.hasStatus ? ["draft", "published"] : undefined}
            sortValue={query.sort}
            sortDirection={query.direction}
            onSortChange={query.setSort}
            sortOptions={sortOptions}
            page={query.page}
            totalPages={totalPages}
            onPageChange={query.setPage}
            resultCount={filtered.length}
          />
        }
      />
      {dialog}
    </div>
  );
}
