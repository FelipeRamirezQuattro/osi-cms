"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Link from "next/link";
import { deleteProductAction, moveProductAction } from "@/lib/actions/products";
import { hasCapability } from "@/lib/auth/capabilities";
import type { AdminRole } from "@/lib/auth";
import type { Tables } from "@/lib/db/database.types";
import { AdminPageHeader, AdminNewLinkButton } from "@/components/admin/ui/admin-page-header";
import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/ui/admin-data-table";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { ReorderButtons, RowActionButton } from "@/components/admin/ui/row-actions";
import { useConfirmDialog } from "@/components/admin/ui/confirm-dialog";

type Product = Tables<"products">;

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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirmDialog();

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
      render: (product, index) => (
        <ReorderButtons
          onMoveUp={() => move(product.id, "up")}
          onMoveDown={() => move(product.id, "down")}
          disabled={isPending}
          disableUp={index === 0}
          disableDown={index === products.length - 1}
        />
      ),
    },
    {
      key: "actions",
      header: "",
      cellClassName: "text-right",
      render: (product) =>
        canDelete && (
          <RowActionButton onClick={() => remove(product)} disabled={isPending} tone="danger">
            Delete
          </RowActionButton>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Products" actions={<AdminNewLinkButton href="/admin/products/new">New product</AdminNewLinkButton>} />

      <AdminDataTable columns={columns} rows={products} getRowKey={(product) => product.id} emptyMessage="No products yet." />
      {dialog}
    </div>
  );
}
