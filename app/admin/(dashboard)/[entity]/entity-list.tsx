"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { EntityConfig, EntityKey } from "@/lib/admin/entity-config";
import { deleteEntityAction, moveEntityAction } from "@/lib/actions/entities";
import { hasCapability } from "@/lib/auth/capabilities";
import type { AdminRole } from "@/lib/auth";
import type { EntityRow } from "@/lib/data/admin-entities";
import { AdminPageHeader, AdminNewLinkButton } from "@/components/admin/ui/admin-page-header";
import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/ui/admin-data-table";
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
            render: (row: EntityRow, index: number) => (
              <ReorderButtons
                onMoveUp={() => move(row.id, "up")}
                onMoveDown={() => move(row.id, "down")}
                disabled={isPending}
                disableUp={index === 0}
                disableDown={index === initialRows.length - 1}
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
        rows={initialRows}
        getRowKey={(row) => row.id}
        emptyMessage={`No ${config.pluralLabel.toLowerCase()} yet.`}
      />
      {dialog}
    </div>
  );
}
