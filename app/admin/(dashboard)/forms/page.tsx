import { listFormDefinitionsAction } from "@/lib/actions/forms";
import { AdminPageHeader, AdminNewLinkButton } from "@/components/admin/ui/admin-page-header";
import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/ui/admin-data-table";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import Link from "next/link";
import type { Tables } from "@/lib/db/database.types";

export const dynamic = "force-dynamic";

type FormDefinitionRow = Tables<"form_definitions">;

const columns: AdminDataTableColumn<FormDefinitionRow>[] = [
  {
    key: "name",
    header: "Name",
    render: (definition) => (
      <Link href={`/admin/forms/${definition.id}`} className="font-medium hover:underline">
        {definition.name}
      </Link>
    ),
  },
  { key: "form_key", header: "Form key", render: (definition) => <span className="opacity-70">{definition.form_key}</span> },
  {
    key: "fields",
    header: "Fields",
    render: (definition) => (
      <span className="opacity-70">{Array.isArray(definition.fields) ? definition.fields.length : 0}</span>
    ),
  },
  { key: "status", header: "Status", render: (definition) => <StatusBadge label={definition.status} /> },
  {
    key: "updated_at",
    header: "Updated",
    render: (definition) => <span className="opacity-50">{new Date(definition.updated_at).toLocaleDateString()}</span>,
  },
];

export default async function AdminFormsListPage() {
  const definitions = await listFormDefinitionsAction();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Forms"
        description={
          <>
            Build any form (contact request, quote request, newsletter signup, etc.) without code — add it to a page
            with the &quot;Form&quot; block, using this form&apos;s key. The site&apos;s dedicated contact form is
            managed separately, via the &quot;Contact form&quot; block.
          </>
        }
        actions={<AdminNewLinkButton href="/admin/forms/new">New form</AdminNewLinkButton>}
      />

      <AdminDataTable columns={columns} rows={definitions} getRowKey={(definition) => definition.id} emptyMessage="No forms yet." />
    </div>
  );
}
