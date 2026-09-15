import type { ReactNode } from "react";
import { EmptyState } from "@/components/admin/ui/empty-state";

/**
 * The shared `<table>` shell behind every admin list screen — Task 12
 * consolidates what were seven near-identical hand-rolled tables
 * (products, entities, forms, shared sections, pages, users, the
 * dashboard's "recently edited" list) into this one component. Domain
 * logic (which columns, what a cell renders, row actions) stays in the
 * caller via `columns`; this only owns the table markup/styling.
 *
 * `variant="panel"` (default) is the bordered-box look every list page
 * under /admin uses. `variant="plain"` matches the dashboard's simpler
 * "recently edited pages" table (no wrapping box, thin bottom-border
 * header) — kept as a variant rather than forcing that screen into the
 * panel look it never had, since this task is about sharing table
 * *markup*, not un-asked-for visual changes.
 */
export type AdminDataTableColumn<T> = {
  key: string;
  header: ReactNode;
  render: (row: T, index: number) => ReactNode;
  /** Extra classes for this column's `<td>` cells (e.g. `"whitespace-nowrap"`, `"text-right"`). */
  cellClassName?: string;
  headerClassName?: string;
};

export type AdminDataTableProps<T> = {
  columns: AdminDataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string;
  emptyMessage?: ReactNode;
  variant?: "panel" | "plain";
  /** "auto" lets a wide table (e.g. the audit log) scroll horizontally instead of overflowing the page. Only meaningful for variant="panel". */
  overflow?: "hidden" | "auto";
  /** Extra classes per row, e.g. `"align-top"` for the audit log's multi-line diff cell. */
  rowClassName?: string;
};

export function AdminDataTable<T>({
  columns,
  rows,
  getRowKey,
  emptyMessage = "No results yet.",
  variant = "panel",
  overflow = "hidden",
  rowClassName,
}: AdminDataTableProps<T>) {
  const isPanel = variant === "panel";

  const table = (
    <table className="w-full text-left text-sm">
      <thead
        className={
          isPanel ? "bg-osi-cream-100 text-xs uppercase tracking-wide-label opacity-70" : "border-b border-osi-sand-300 opacity-60"
        }
      >
        <tr>
          {columns.map((col) => (
            <th key={col.key} className={`${isPanel ? "px-4 py-2" : "py-2 font-normal"} ${col.headerClassName ?? ""}`}>
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr
            key={getRowKey(row, index)}
            className={`${isPanel ? "border-t border-osi-sand-300" : "border-b border-osi-sand-300/50"} ${rowClassName ?? ""}`}
          >
            {columns.map((col) => (
              <td key={col.key} className={`${isPanel ? "px-4 py-2" : "py-2"} ${col.cellClassName ?? ""}`}>
                {col.render(row, index)}
              </td>
            ))}
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={columns.length} className="p-0">
              <EmptyState message={emptyMessage} className={isPanel ? "px-4 py-6" : "py-6"} />
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );

  if (!isPanel) return table;

  return (
    <div className={`rounded border border-osi-sand-300 bg-osi-white ${overflow === "auto" ? "overflow-x-auto" : "overflow-hidden"}`}>
      {table}
    </div>
  );
}
