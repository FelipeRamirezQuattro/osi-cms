import type { Metadata } from "next";
import Link from "next/link";
import { requireCapability } from "@/lib/auth";
import { listAuditFiltersAction, listAuditLogAction } from "@/lib/actions/audit";
import type { AuditLogFilters } from "@/lib/data/audit";

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
      <div className="flex items-center justify-between">
        <h1 className="font-display text-lg tracking-wide-display uppercase">Audit log</h1>
        <p className="text-xs opacity-50">Showing the {entries.length} most recent matching entries</p>
      </div>

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

      <div className="overflow-x-auto rounded border border-osi-sand-300 bg-osi-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-osi-cream-100 text-xs uppercase tracking-wide-label opacity-70">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Actor</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Entity</th>
              <th className="px-4 py-2">Entity ID</th>
              <th className="px-4 py-2">Diff</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-t border-osi-sand-300 align-top">
                <td className="whitespace-nowrap px-4 py-2 text-xs opacity-70">{new Date(entry.created_at).toLocaleString()}</td>
                <td className="px-4 py-2">{entry.actorEmail ?? <span className="opacity-40">Unknown</span>}</td>
                <td className="px-4 py-2">
                  <span className="rounded bg-osi-sand-300/50 px-2 py-0.5 text-xs uppercase tracking-wide-label">{entry.action}</span>
                </td>
                <td className="px-4 py-2">{entry.entity}</td>
                <td className="px-4 py-2 font-mono text-xs opacity-60">{entry.entity_id ?? "—"}</td>
                <td className="px-4 py-2">
                  <DiffPreview diff={entry.diff} />
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center opacity-50">
                  No audit entries match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
