import { listAllSharedSections } from "@/lib/data/shared-sections";
import { AdminPageHeader, AdminNewLinkButton } from "@/components/admin/ui/admin-page-header";
import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/ui/admin-data-table";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import Link from "next/link";
import type { Tables } from "@/lib/db/database.types";

export const dynamic = "force-dynamic";

type SharedSectionRow = Tables<"shared_sections">;

const columns: AdminDataTableColumn<SharedSectionRow>[] = [
  {
    key: "title",
    header: "Title",
    render: (section) => (
      <Link href={`/admin/shared-sections/${section.id}`} className="font-medium hover:underline">
        {section.title}
      </Link>
    ),
  },
  { key: "key", header: "Key", render: (section) => <span className="opacity-70">{section.key}</span> },
  { key: "status", header: "Status", render: (section) => <StatusBadge label={section.status} /> },
  {
    key: "updated_at",
    header: "Updated",
    render: (section) => <span className="opacity-50">{new Date(section.updated_at).toLocaleDateString()}</span>,
  },
];

export default async function AdminSharedSectionsListPage() {
  const sections = await listAllSharedSections();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Shared sections"
        description={
          <>
            A reusable block sequence referenced by key from any page (via the &quot;Shared section&quot; block).
            Editing a shared section&apos;s blocks only affects live pages once you publish it here — same
            draft/publish separation as a page.
          </>
        }
        actions={
          <AdminNewLinkButton href="/admin/shared-sections/new">New shared section</AdminNewLinkButton>
        }
      />

      <AdminDataTable
        columns={columns}
        rows={sections}
        getRowKey={(section) => section.id}
        emptyMessage="No shared sections yet."
      />
    </div>
  );
}
