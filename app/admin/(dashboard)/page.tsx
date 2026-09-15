import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { hasCapability } from "@/lib/auth/capabilities";
import { listAllPages } from "@/lib/data/pages";
import { countNewSubmissions } from "@/lib/data/forms";
import { countDraftsAwaitingPublication } from "@/lib/data/dashboard";
import { countMissingAltMedia } from "@/lib/data/media";
import { listBrokenLinks } from "@/lib/data/link-audit";
import { listAuditLog, type AuditLogEntry } from "@/lib/data/audit";
import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/ui/admin-data-table";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import type { Tables } from "@/lib/db/database.types";

export const dynamic = "force-dynamic";

type PageRow = Tables<"pages">;

const pageColumns: AdminDataTableColumn<PageRow>[] = [
  {
    key: "title",
    header: "Title",
    render: (page) => (
      <Link href={`/admin/pages/${page.id}`} className="hover:underline">
        {page.title}
      </Link>
    ),
  },
  { key: "slug", header: "Slug", render: (page) => <span className="opacity-70">/{page.slug}</span> },
  { key: "status", header: "Status", render: (page) => <span className="capitalize opacity-70">{page.status}</span> },
  {
    key: "updated_at",
    header: "Updated",
    render: (page) => <span className="opacity-70">{new Date(page.updated_at).toLocaleString()}</span>,
  },
];

const auditColumns: AdminDataTableColumn<AuditLogEntry>[] = [
  {
    key: "created_at",
    header: "Date",
    cellClassName: "whitespace-nowrap text-xs opacity-70",
    render: (entry) => new Date(entry.created_at).toLocaleString(),
  },
  { key: "actor", header: "Actor", render: (entry) => entry.actorEmail ?? <span className="opacity-40">Unknown</span> },
  {
    key: "action",
    header: "Action",
    render: (entry) => (
      <span className="rounded bg-osi-sand-300/50 px-2 py-0.5 text-xs uppercase tracking-wide-label">{entry.action}</span>
    ),
  },
  { key: "entity", header: "Entity", render: (entry) => entry.entity },
];

function StatCard({ value, label, href }: { value: number; label: string; href: string }) {
  return (
    <div className="rounded border border-osi-sand-300 bg-white p-6">
      <p className="font-display text-3xl text-osi-gold-700">{value}</p>
      <p className="text-sm opacity-70">{label}</p>
      <Link href={href} className="mt-2 inline-block text-sm hover:underline">
        View →
      </Link>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const session = await requireAdmin();
  const canViewSubmissions = hasCapability(session.role, "view_submissions");
  const canViewAudit = hasCapability(session.role, "view_audit");
  const canEditDrafts = hasCapability(session.role, "edit_drafts");
  const canUploadMedia = hasCapability(session.role, "upload_media");

  const [pages, newSubmissions, draftCounts, missingAltCount, brokenLinks, auditEntries] = await Promise.all([
    listAllPages(),
    canViewSubmissions ? countNewSubmissions() : Promise.resolve(0),
    canEditDrafts ? countDraftsAwaitingPublication() : Promise.resolve(null),
    canUploadMedia ? countMissingAltMedia() : Promise.resolve(0),
    canEditDrafts ? listBrokenLinks() : Promise.resolve([]),
    canViewAudit ? listAuditLog({ limit: 8 }) : Promise.resolve([]),
  ]);

  const recentPages = pages.slice(0, 8);

  return (
    <div className="space-y-10">
      <AdminPageHeader title="Dashboard" />

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {canViewSubmissions && <StatCard value={newSubmissions} label="New submissions" href="/admin/submissions" />}
        <StatCard value={pages.length} label="Total pages" href="/admin/pages" />
        {draftCounts && (
          <StatCard
            value={draftCounts.total}
            label="Drafts awaiting publication"
            href="/admin/pages?status=draft"
          />
        )}
        {canUploadMedia && <StatCard value={missingAltCount} label="Images missing alt text" href="/admin/media" />}
        {canEditDrafts && <StatCard value={brokenLinks.length} label="Broken internal links" href="/admin/pages" />}
      </div>

      {draftCounts && draftCounts.total > 0 && (
        <p className="text-xs opacity-60">
          Drafts by type: {draftCounts.pages} page{draftCounts.pages === 1 ? "" : "s"}, {draftCounts.products} product
          {draftCounts.products === 1 ? "" : "s"}, {draftCounts.sharedSections} shared section
          {draftCounts.sharedSections === 1 ? "" : "s"}, {draftCounts.forms} form{draftCounts.forms === 1 ? "" : "s"}.
        </p>
      )}

      {canEditDrafts && brokenLinks.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg tracking-wide-display uppercase">Broken internal links</h2>
          <div className="overflow-hidden rounded border border-osi-sand-300 bg-osi-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-osi-cream-100 text-xs uppercase tracking-wide-label opacity-70">
                <tr>
                  <th className="px-4 py-2">Source</th>
                  <th className="px-4 py-2">Broken link</th>
                </tr>
              </thead>
              <tbody>
                {brokenLinks.slice(0, 10).map((link, index) => (
                  <tr key={`${link.href}-${index}`} className="border-t border-osi-sand-300">
                    <td className="px-4 py-2">
                      {link.sourceHref ? (
                        <Link href={link.sourceHref} className="hover:underline">
                          {link.sourceLabel}
                        </Link>
                      ) : (
                        link.sourceLabel
                      )}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs opacity-70">{link.href}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {brokenLinks.length > 10 && <p className="text-xs opacity-50">…and {brokenLinks.length - 10} more.</p>}
        </section>
      )}

      <section className="space-y-4">
        <h2 className="font-display text-lg tracking-wide-display uppercase">Recently edited pages</h2>
        <AdminDataTable
          columns={pageColumns}
          rows={recentPages}
          getRowKey={(page) => page.id}
          variant="plain"
          emptyMessage="No pages yet."
        />
      </section>

      {canViewAudit && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg tracking-wide-display uppercase">Recent activity</h2>
            <Link href="/admin/audit-log" className="text-sm hover:underline">
              View full audit log →
            </Link>
          </div>
          <AdminDataTable
            columns={auditColumns}
            rows={auditEntries}
            getRowKey={(entry) => entry.id}
            variant="plain"
            emptyMessage="No activity recorded yet."
          />
        </section>
      )}
    </div>
  );
}
