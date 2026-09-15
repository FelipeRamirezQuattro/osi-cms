import type { Metadata } from "next";
import Link from "next/link";
import { requireCapability } from "@/lib/auth";
import { listAuditFiltersAction, listAuditLogAction } from "@/lib/actions/audit";
import type { AuditLogEntry, AuditLogFilters } from "@/lib/data/audit";
import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/ui/admin-data-table";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

function firstValue(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

/** Renders a compact, single-line preview of a diff — the full object is in the title attribute for hover. */
function DiffPreview({ diff }: { diff: unknown }) {
  if (diff === null || diff === undefined) return <span className="opacity-40">—</span>;
  const json = JSON.stringify(diff);
  const preview = json.length > 80 ? `${json.slice(0, 80)}…` : json;
  return (
    <code title={JSON.stringify(diff, null, 2)} className="text-xs opacity-70">
      {preview}
    </code>
  );
}

const columns: AdminDataTableColumn<AuditLogEntry>[] = [
  {
    key: "created_at",
    header: "Date",
    cellClassName: "whitespace-nowrap text-xs opacity-70",
    render: (entry) => new Date(entry.created_at).toLocaleString(),
  },
  {
    key: "actor",
    header: "Actor",
    render: (entry) => entry.actorEmail ?? <span className="opacity-40">Unknown</span>,
  },
  {
    key: "action",
    header: "Action",
    render: (entry) => (
      <span className="rounded bg-osi-sand-300/50 px-2 py-0.5 text-xs uppercase tracking-wide-label">{entry.action}</span>
    ),
  },
  { key: "entity", header: "Entity", render: (entry) => entry.entity },
  {
    key: "entity_id",
    header: "Entity ID",
    cellClassName: "font-mono text-xs opacity-60",
    render: (entry) => entry.entity_id ?? "—",
  },
  { key: "diff", header: "Diff", render: (entry) => <DiffPreview diff={entry.diff} /> },
];

export default async function AuditLogPage({ searchParams }: PageProps<"/admin/audit-log">) {
  await requireCapability("view_audit");
  const params = await searchParams;

  const filters: AuditLogFilters = {
    actorId: firstValue(params.actor) || undefined,
    entity: firstValue(params.entity) || undefined,
    action: firstValue(params.action) || undefined,
    dateFrom: firstValue(params.from) || undefined,
    dateTo: firstValue(params.to) || undefined,
  };

  const [{ actors, entities, actions }, entries] = await Promise.all([
    listAuditFiltersAction(),
    listAuditLogAction(filters),
  ]);

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Audit log"
        actions={<p className="text-xs opacity-50">Showing the {entries.length} most recent matching entries</p>}
      />

      <form
        method="get"
        className="grid grid-cols-2 gap-3 rounded border border-osi-sand-300 bg-osi-white p-4 text-sm md:grid-cols-5"
      >
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide-label opacity-60">Actor</span>
          <select name="actor" defaultValue={filters.actorId ?? ""} className="rounded border border-osi-sand-300 px-2 py-1.5">
            <option value="">All actors</option>
            {actors.map((actor) => (
              <option key={actor.id} value={actor.id}>
                {actor.email}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide-label opacity-60">Entity</span>
          <select name="entity" defaultValue={filters.entity ?? ""} className="rounded border border-osi-sand-300 px-2 py-1.5">
            <option value="">All entities</option>
            {entities.map((entity) => (
              <option key={entity} value={entity}>
                {entity}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide-label opacity-60">Action</span>
          <select name="action" defaultValue={filters.action ?? ""} className="rounded border border-osi-sand-300 px-2 py-1.5">
            <option value="">All actions</option>
            {actions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide-label opacity-60">From</span>
          <input type="date" name="from" defaultValue={filters.dateFrom ?? ""} className="rounded border border-osi-sand-300 px-2 py-1.5" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide-label opacity-60">To</span>
          <input type="date" name="to" defaultValue={filters.dateTo ?? ""} className="rounded border border-osi-sand-300 px-2 py-1.5" />
        </label>

        <div className="col-span-2 flex items-end gap-3 md:col-span-5">
          <button type="submit" className="rounded bg-osi-navy-900 px-4 py-2 text-xs uppercase tracking-wide-label text-osi-white">
            Apply filters
          </button>
          {hasFilters && (
            <Link href="/admin/audit-log" className="text-xs uppercase tracking-wide-label opacity-60 hover:underline">
              Clear
            </Link>
          )}
        </div>
      </form>

      <AdminDataTable
        columns={columns}
        rows={entries}
        getRowKey={(entry) => entry.id}
        overflow="auto"
        rowClassName="align-top"
        emptyMessage="No audit entries match these filters."
      />
    </div>
  );
}
