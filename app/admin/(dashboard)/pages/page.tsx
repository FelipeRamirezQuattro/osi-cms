import { listAllPages } from "@/lib/data/pages";
import { AdminPageHeader, AdminNewLinkButton } from "@/components/admin/ui/admin-page-header";
import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/ui/admin-data-table";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import Link from "next/link";
import type { Tables } from "@/lib/db/database.types";

export const dynamic = "force-dynamic";

type PageRow = Tables<"pages">;

const columns: AdminDataTableColumn<PageRow>[] = [
  {
    key: "title",
    header: "Title",
    render: (page) => (
      <>
        <Link href={`/admin/pages/${page.id}`} className="font-medium hover:underline">
          {page.title}
        </Link>
        {page.is_system && <span className="ml-2 text-[10px] uppercase tracking-wide-label opacity-50">system</span>}
      </>
    ),
  },
  { key: "slug", header: "Slug", render: (page) => <span className="opacity-70">/{page.slug}</span> },
  { key: "template", header: "Template", render: (page) => <span className="opacity-70">{page.template}</span> },
  { key: "status", header: "Status", render: (page) => <StatusBadge label={page.status} /> },
  {
    key: "updated_at",
    header: "Updated",
    render: (page) => <span className="opacity-50">{new Date(page.updated_at).toLocaleDateString()}</span>,
  },
];

export default async function AdminPagesListPage() {
  const pages = await listAllPages();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Pages"
        actions={<AdminNewLinkButton href="/admin/pages/new">New page</AdminNewLinkButton>}
      />

      <AdminDataTable columns={columns} rows={pages} getRowKey={(page) => page.id} emptyMessage="No pages yet." />
    </div>
  );
}
