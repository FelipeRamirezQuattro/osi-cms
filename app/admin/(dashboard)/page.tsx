import Link from "next/link";
import { listAllPages } from "@/lib/data/pages";
import { countNewSubmissions } from "@/lib/data/forms";
import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/ui/admin-data-table";
import type { Tables } from "@/lib/db/database.types";

type PageRow = Tables<"pages">;

const columns: AdminDataTableColumn<PageRow>[] = [
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

export default async function AdminDashboardPage() {
  const [pages, newSubmissions] = await Promise.all([listAllPages(), countNewSubmissions()]);
  const recentPages = pages.slice(0, 8);

  return (
    <div>
      <h1 className="mb-8 font-display text-2xl tracking-wide-display uppercase">Dashboard</h1>

      <div className="mb-10 grid grid-cols-2 gap-6 sm:grid-cols-3">
        <div className="rounded border border-osi-sand-300 bg-white p-6">
          <p className="font-display text-3xl text-osi-gold-700">{newSubmissions}</p>
          <p className="text-sm opacity-70">New submissions</p>
          <Link href="/admin/submissions" className="mt-2 inline-block text-sm hover:underline">
            View →
          </Link>
        </div>
        <div className="rounded border border-osi-sand-300 bg-white p-6">
          <p className="font-display text-3xl text-osi-gold-700">{pages.length}</p>
          <p className="text-sm opacity-70">Total pages</p>
          <Link href="/admin/pages" className="mt-2 inline-block text-sm hover:underline">
            View →
          </Link>
        </div>
      </div>

      <h2 className="mb-4 font-display text-lg tracking-wide-display uppercase">Recently edited pages</h2>
      <AdminDataTable
        columns={columns}
        rows={recentPages}
        getRowKey={(page) => page.id}
        variant="plain"
        emptyMessage="No pages yet."
      />
    </div>
  );
}
