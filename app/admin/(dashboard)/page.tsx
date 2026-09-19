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
import { StatCard } from "@/components/admin/ui/stat-card";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { adminButtonClassName } from "@/components/admin/ui/button";
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
  {
    key: "slug",
    header: "Slug",
    render: (page) => <span className="opacity-70">/{page.slug}</span>,
  },
  { key: "status", header: "Status", render: (page) => <StatusBadge label={page.status} /> },
  {
    key: "updated_at",
    header: "Updated",
    render: (page) => (
      <span className="opacity-70">{new Date(page.updated_at).toLocaleString()}</span>
    ),
  },
];

const auditColumns: AdminDataTableColumn<AuditLogEntry>[] = [
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
      <span className="bg-osi-sand-300/50 tracking-wide-label rounded px-2 py-0.5 text-xs uppercase">
        {entry.action}
      </span>
    ),
  },
  { key: "entity", header: "Entity", render: (entry) => entry.entity },
];

function DashboardSectionHeader({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      {href && linkLabel && (
        <Link
          href={href}
          className="text-sm font-medium text-[var(--admin-primary)] hover:underline"
        >
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}

function QuickActions({ canUploadMedia }: { canUploadMedia: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/admin/pages/new" className={adminButtonClassName("primary")}>
        New page
      </Link>
      <Link href="/admin/products/new" className={adminButtonClassName("secondary")}>
        New product
      </Link>
      <Link href="/admin/news/new" className={adminButtonClassName("secondary")}>
        New article
      </Link>
      {canUploadMedia && (
        <Link href="/admin/media" className={adminButtonClassName("secondary")}>
          Upload media
        </Link>
      )}
    </div>
  );
}

function AttentionPanel({
  draftCount,
  brokenLinkCount,
  missingAltCount,
}: {
  draftCount: number;
  brokenLinkCount: number;
  missingAltCount: number;
}) {
  const items = [
    { value: draftCount, label: "Drafts awaiting publication", href: "/admin/pages?status=draft" },
    { value: brokenLinkCount, label: "Internal links to review", href: "/admin/pages" },
    { value: missingAltCount, label: "Images missing alt text", href: "/admin/media" },
  ].filter((item) => item.value > 0);

  return (
    <section className="admin-card p-5 sm:p-6">
      <DashboardSectionHeader title="Needs attention" />
      {items.length === 0 ? (
        <p className="mt-4 rounded-xl bg-[var(--admin-success-soft)] p-4 text-sm text-[var(--admin-success)]">
          Everything is clear. There are no outstanding content checks.
        </p>
      ) : (
        <div className="mt-4 divide-y divide-[var(--admin-border)]">
          {items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 hover:text-[var(--admin-primary)]"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--admin-warning-soft)] text-sm font-semibold text-[var(--admin-warning)]">
                {item.value}
              </span>
              <span className="text-sm font-medium">{item.label}</span>
              <span className="ml-auto text-[var(--admin-ink-secondary)]" aria-hidden="true">
                →
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

const brokenLinkColumns: AdminDataTableColumn<
  Awaited<ReturnType<typeof listBrokenLinks>>[number]
>[] = [
  {
    key: "source",
    header: "Source",
    render: (link) =>
      link.sourceHref ? (
        <Link href={link.sourceHref} className="font-medium hover:underline">
          {link.sourceLabel}
        </Link>
      ) : (
        link.sourceLabel
      ),
  },
  {
    key: "href",
    header: "Link to review",
    render: (link) => (
      <span className="font-mono text-xs text-[var(--admin-ink-secondary)]">{link.href}</span>
    ),
  },
];

export default async function AdminDashboardPage() {
  const session = await requireAdmin();
  const canViewSubmissions = hasCapability(session.role, "view_submissions");
  const canViewAudit = hasCapability(session.role, "view_audit");
  const canEditDrafts = hasCapability(session.role, "edit_drafts");
  const canUploadMedia = hasCapability(session.role, "upload_media");

  const [pages, newSubmissions, draftCounts, missingAltCount, brokenLinks, auditEntries] =
    await Promise.all([
      listAllPages(),
      canViewSubmissions ? countNewSubmissions() : Promise.resolve(0),
      canEditDrafts ? countDraftsAwaitingPublication() : Promise.resolve(null),
      canUploadMedia ? countMissingAltMedia() : Promise.resolve(0),
      canEditDrafts ? listBrokenLinks() : Promise.resolve([]),
      canViewAudit ? listAuditLog({ limit: 8 }) : Promise.resolve([]),
    ]);

  const recentPages = pages.slice(0, 8);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Dashboard"
        description="A clear view of publishing work, content health, and recent activity."
        actions={canEditDrafts ? <QuickActions canUploadMedia={canUploadMedia} /> : undefined}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {canViewSubmissions && (
          <StatCard value={newSubmissions} label="New submissions" href="/admin/submissions" />
        )}
        <StatCard value={pages.length} label="Total pages" href="/admin/pages" />
        {draftCounts && (
          <StatCard
            value={draftCounts.total}
            label="Drafts awaiting publication"
            href="/admin/pages?status=draft"
          />
        )}
        {canUploadMedia && (
          <StatCard value={missingAltCount} label="Images missing alt text" href="/admin/media" />
        )}
        {canEditDrafts && (
          <StatCard value={brokenLinks.length} label="Broken internal links" href="/admin/pages" />
        )}
      </div>

      <AttentionPanel
        draftCount={draftCounts?.total ?? 0}
        brokenLinkCount={canEditDrafts ? brokenLinks.length : 0}
        missingAltCount={canUploadMedia ? missingAltCount : 0}
      />

      {draftCounts && draftCounts.total > 0 && (
        <p className="text-xs opacity-60">
          Drafts by type: {draftCounts.pages} page{draftCounts.pages === 1 ? "" : "s"},{" "}
          {draftCounts.products} product
          {draftCounts.products === 1 ? "" : "s"}, {draftCounts.sharedSections} shared section
          {draftCounts.sharedSections === 1 ? "" : "s"}, {draftCounts.forms} form
          {draftCounts.forms === 1 ? "" : "s"}.
        </p>
      )}

      {canEditDrafts && brokenLinks.length > 0 && (
        <section className="space-y-3">
          <DashboardSectionHeader title="Links to review" />
          <AdminDataTable
            columns={brokenLinkColumns}
            rows={brokenLinks.slice(0, 10)}
            getRowKey={(link, index) => `${link.href}-${index}`}
          />
          {brokenLinks.length > 10 && (
            <p className="text-xs opacity-50">…and {brokenLinks.length - 10} more.</p>
          )}
        </section>
      )}

      <section className="space-y-4">
        <DashboardSectionHeader
          title="Recently edited pages"
          href="/admin/pages"
          linkLabel="View all pages"
        />
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
          <DashboardSectionHeader
            title="Recent activity"
            href="/admin/audit-log"
            linkLabel="View audit log"
          />
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
