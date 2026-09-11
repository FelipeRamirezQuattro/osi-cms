"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { EntityConfig, EntityKey } from "@/lib/admin/entity-config";
import { deleteEntityAction, moveEntityAction } from "@/lib/actions/entities";
import type { EntityRow } from "@/lib/data/admin-entities";

export function EntityList({
  entity,
  config,
  initialRows,
}: {
  entity: EntityKey;
  config: EntityConfig;
  initialRows: EntityRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function move(id: string, direction: "up" | "down") {
    startTransition(async () => {
      await moveEntityAction(entity, id, direction);
      router.refresh();
    });
  }

  function remove(row: EntityRow) {
    if (!window.confirm(`Delete this ${config.label.toLowerCase()}? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteEntityAction(entity, row.id);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-lg tracking-wide-display uppercase">{config.pluralLabel}</h1>
        <Link
          href={`/admin/${entity}/new`}
          className="rounded bg-osi-navy-900 px-4 py-2 text-xs uppercase tracking-wide-label text-osi-white"
        >
          New {config.label.toLowerCase()}
        </Link>
      </div>

      <div className="overflow-hidden rounded border border-osi-sand-300 bg-osi-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-osi-cream-100 text-xs uppercase tracking-wide-label opacity-70">
            <tr>
              {config.listColumns.map((col) => (
                <th key={col.key} className="px-4 py-2">
                  {col.label}
                </th>
              ))}
              {config.hasStatus && <th className="px-4 py-2">Status</th>}
              {config.hasPosition && <th className="px-4 py-2">Order</th>}
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {initialRows.map((row, index) => (
              <tr key={row.id} className="border-t border-osi-sand-300">
                {config.listColumns.map((col) => (
                  <td key={col.key} className="px-4 py-2">
                    {col.key === config.listColumns[0].key ? (
                      <Link href={`/admin/${entity}/${row.id}`} className="font-medium hover:underline">
                        {String(row[col.key] ?? "")}
                      </Link>
                    ) : (
                      <span className="opacity-70">{String(row[col.key] ?? "")}</span>
                    )}
                  </td>
                ))}
                {config.hasStatus && (
                  <td className="px-4 py-2">
                    <span
                      className={
                        row.status === "published"
                          ? "rounded bg-green-100 px-2 py-0.5 text-xs text-green-800"
                          : "rounded bg-osi-sand-300/50 px-2 py-0.5 text-xs opacity-70"
                      }
                    >
                      {String(row.status)}
                    </span>
                  </td>
                )}
                {config.hasPosition && (
                  <td className="px-4 py-2">
                    <div className="flex gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => move(row.id, "up")}
                        disabled={isPending || index === 0}
                        className="disabled:opacity-30"
                        aria-label="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => move(row.id, "down")}
                        disabled={isPending || index === initialRows.length - 1}
                        className="disabled:opacity-30"
                        aria-label="Move down"
                      >
                        ↓
                      </button>
                    </div>
                  </td>
                )}
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => remove(row)}
                    disabled={isPending}
                    className="text-xs text-red-600 hover:underline disabled:opacity-40"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {initialRows.length === 0 && (
              <tr>
                <td
                  colSpan={config.listColumns.length + (config.hasStatus ? 1 : 0) + (config.hasPosition ? 1 : 0) + 1}
                  className="px-4 py-6 text-center opacity-50"
                >
                  No {config.pluralLabel.toLowerCase()} yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
