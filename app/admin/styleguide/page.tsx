import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/ui/admin-data-table";
import { AsyncMessage } from "@/components/admin/ui/async-message";
import { Button } from "@/components/admin/ui/button";
import { Card } from "@/components/admin/ui/card";
import { FormField } from "@/components/admin/ui/form-field";
import { Input } from "@/components/admin/ui/input";
import { SearchField } from "@/components/admin/ui/search-field";
import { Select } from "@/components/admin/ui/select";
import { Skeleton } from "@/components/admin/ui/skeleton";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { Textarea } from "@/components/admin/ui/textarea";
import { ADMIN_NAV_GROUPS } from "@/lib/admin/nav-config";

type ExampleRow = { id: string; title: string; status: string; updated: string };

const rows: ExampleRow[] = [
  { id: "1", title: "About OSI", status: "published", updated: "A few minutes ago" },
  { id: "2", title: "New product overview", status: "draft", updated: "Yesterday" },
];

const columns: AdminDataTableColumn<ExampleRow>[] = [
  {
    key: "title",
    header: "Title",
    render: (row) => <span className="font-medium">{row.title}</span>,
  },
  { key: "status", header: "Status", render: (row) => <StatusBadge label={row.status} /> },
  {
    key: "updated",
    header: "Updated",
    render: (row) => <span className="text-[var(--admin-ink-secondary)]">{row.updated}</span>,
  },
];

export default function AdminStyleguidePage() {
  if (process.env.NODE_ENV !== "development") notFound();

  const groups = [
    ...ADMIN_NAV_GROUPS,
    {
      label: "Development",
      items: [{ href: "/admin/styleguide", label: "UI styleguide", capability: null }],
    },
  ];

  return (
    <AdminShell
      groups={groups}
      session={{ email: "editor@osi.example", role: "admin" }}
      signOut={
        <button type="button" className="mt-3 font-medium text-slate-300">
          Sign out
        </button>
      }
    >
      <div className="space-y-8">
        <AdminPageHeader
          title="Admin UI styleguide"
          description="Development-only preview of the scoped admin system and its interaction states."
          actions={<Button>Primary action</Button>}
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Cards">
          {[
            ["24", "Published pages"],
            ["6", "Drafts"],
            ["3", "New submissions"],
            ["0", "Broken links"],
          ].map(([value, label]) => (
            <Card key={label} className="p-5">
              <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
              <p className="mt-1 text-sm text-[var(--admin-ink-secondary)]">{label}</p>
            </Card>
          ))}
        </section>

        <Card className="space-y-5 p-5 sm:p-6">
          <div>
            <h2 className="text-base font-semibold">Controls</h2>
            <p className="mt-1 text-sm text-[var(--admin-ink-secondary)]">
              Default, focusable, disabled, and validation states.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label="Page title"
              htmlFor="styleguide-title"
              help="Shown in navigation and browser results."
            >
              <Input id="styleguide-title" defaultValue="About OSI" />
            </FormField>
            <FormField label="Search content" htmlFor="styleguide-search">
              <SearchField id="styleguide-search" placeholder="Search pages, products, and media" />
            </FormField>
            <FormField label="Status" htmlFor="styleguide-status">
              <Select id="styleguide-status" defaultValue="draft">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </Select>
            </FormField>
            <FormField
              label="Internal note"
              htmlFor="styleguide-note"
              error="Add a short note before continuing."
            >
              <Textarea id="styleguide-note" aria-invalid="true" />
            </FormField>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button>Save changes</Button>
            <Button variant="secondary">Preview</Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="danger">Delete</Button>
            <Button disabled>Saving…</Button>
          </div>
          <div className="flex flex-wrap gap-4">
            <AsyncMessage message={{ kind: "success", text: "Changes saved." }} />
            <AsyncMessage message={{ kind: "error", text: "Review the highlighted fields." }} />
          </div>
        </Card>

        <AdminDataTable columns={columns} rows={rows} getRowKey={(row) => row.id} />

        <Card className="grid gap-3 p-5 sm:grid-cols-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </Card>
      </div>
    </AdminShell>
  );
}
