"use client";

import { useRouter } from "next/navigation";
import { useMemo, useTransition } from "react";
import Link from "next/link";
import { archiveProductAction, deleteProductAction, moveProductAction, restoreProductAction } from "@/lib/actions/products";
import { hasCapability } from "@/lib/auth/capabilities";
import type { AdminRole } from "@/lib/auth";
import type { Tables } from "@/lib/db/database.types";
import { filterByStatus, filterBySearch, paginate, sortRows } from "@/lib/admin/list-query";
import { AdminPageHeader, AdminNewLinkButton } from "@/components/admin/ui/admin-page-header";
import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/ui/admin-data-table";
import { AdminListControls, type SortOption } from "@/components/admin/ui/admin-list-controls";
import { useListQueryState } from "@/components/admin/ui/use-list-query-state";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { ReorderButtons, RowActionButton } from "@/components/admin/ui/row-actions";
import { useConfirmDialog } from "@/components/admin/ui/confirm-dialog";

type Product = Tables<"products">;

const SORT_OPTIONS: SortOption[] = [
  { value: "name", label: "Name A-Z", direction: "asc" },
  { value: "name", label: "Name Z-A", direction: "desc" },
  { value: "status", label: "Status A-Z", direction: "asc" },
];

export function ProductsList({
  products,
  categoryNames,
  role,
}: {
  products: Product[];
  categoryNames: Record<string, string>;
  role: AdminRole;
}) {
  const canDelete = hasCapability(role, "delete_content");
  const canEditDrafts = hasCapability(role, "edit_drafts");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirmDialog();
  const query = useListQueryState();

  const positionById = useMemo(() => new Map(products.map((product, index) => [product.id, index])), [products]);
  const filtersActive = query.q !== "" || query.status !== "" || query.sort !== "";

  const filtered = useMemo(() => {
    let rows = filterBySearch(
      products,
      query.q,
      (product) => `${product.name} ${product.category_id ? (categoryNames[product.category_id] ?? "") : ""}`,
    );
    rows = filterByStatus(rows, query.status, (product) => product.status);
    if (query.sort) rows = sortRows(rows, (product) => String(product[query.sort as keyof Product] ?? ""), query.direction);
    return rows;
  }, [products, query.q, query.status, query.sort, query.direction, categoryNames]);

  const { rows: pageRows, totalPages, page: currentPage } = paginate(filtered, query.page);

  function move(id: string, direction: "up" | "down") {
    startTransition(async () => {
      await moveProductAction(id, direction);
      router.refresh();
    });
  }

  async function remove(product: Product) {
    const ok = await confirm({
      title: `Delete "${product.name}"?`,
      message: "This cannot be undone.",
      tone: "danger",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteProductAction(product.id);
    });
  }

  async function archive(product: Product) {
    const ok = await confirm({
      title: `Archive "${product.name}"?`,
      message: "Archived products are hidden from the public site but not deleted — restore them anytime.",
      confirmLabel: "Archive",
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await archiveProductAction(product.id);
      if (result.status === "error") {
        await confirm({ title: "Can't archive", message: result.message, hideCancel: true, confirmLabel: "OK" });
        return;
      }
      router.refresh();
    });
  }

  function restore(product: Product) {
    startTransition(async () => {
      const result = await restoreProductAction(product.id);
      if (result.status === "error") {
        await confirm({ title: "Can't restore", message: result.message, hideCancel: true, confirmLabel: "OK" });
        return;
      }
      router.refresh();
    });
  }

  const columns: AdminDataTableColumn<Product>[] = [
    {
      key: "name",
      header: "Name",
      render: (product) => (
        <Link href={`/admin/products/${product.id}`} className="font-medium hover:underline">
          {product.name}
        </Link>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (product) => (
        <span className="opacity-70">{product.category_id ? (categoryNames[product.category_id] ?? "—") : "—"}</span>
      ),
    },
    { key: "status", header: "Status", render: (product) => <StatusBadge label={product.status} /> },
    {
      key: "order",
      header: "Order",
      render: (product) =>
        filtersActive ? (
          <span className="text-xs opacity-40" title="Clear search/filter/sort to reorder">
            —
          </span>
        ) : (
          <ReorderButtons
            onMoveUp={() => move(product.id, "up")}
            onMoveDown={() => move(product.id, "down")}
            disabled={isPending}
            disableUp={(positionById.get(product.id) ?? 0) === 0}
            disableDown={(positionById.get(product.id) ?? 0) === products.length - 1}
            itemLabel={product.name}
          />
        ),
    },
    {
      key: "actions",
      header: "",
      cellClassName: "text-right",
      render: (product) => (
        <span className="inline-flex gap-3">
          {canEditDrafts &&
            (product.status === "archived" ? (
              <RowActionButton onClick={() => restore(product)} disabled={isPending}>
                Restore
              </RowActionButton>
            ) : (
              <RowActionButton onClick={() => archive(product)} disabled={isPending}>
                Archive
              </RowActionButton>
            ))}
          {canDelete && (
            <RowActionButton onClick={() => remove(product)} disabled={isPending} tone="danger">
              Delete
            </RowActionButton>
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Products" actions={<AdminNewLinkButton href="/admin/products/new">New product</AdminNewLinkButton>} />

      <AdminDataTable
        columns={columns}
        rows={pageRows}
        getRowKey={(product) => product.id}
        emptyMessage={products.length === 0 ? "No products yet." : "No results match these filters."}
        toolbar={
          <AdminListControls
            searchValue={query.q}
            onSearchChange={query.setQuery}
            searchPlaceholder="Search products…"
            statusValue={query.status}
            onStatusChange={query.setStatus}
            statusOptions={["draft", "published", "archived"]}
            sortValue={query.sort}
            sortDirection={query.direction}
            onSortChange={query.setSort}
            sortOptions={SORT_OPTIONS}
            page={currentPage}
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
