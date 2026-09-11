import Link from "next/link";
import { listAllPages } from "@/lib/data/pages";

export const dynamic = "force-dynamic";

export default async function AdminPagesListPage() {
  const pages = await listAllPages();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-lg tracking-wide-display uppercase">Pages</h1>
        <Link
          href="/admin/pages/new"
          className="rounded bg-osi-navy-900 px-4 py-2 text-xs uppercase tracking-wide-label text-osi-white"
        >
          New page
        </Link>
      </div>

      <div className="overflow-hidden rounded border border-osi-sand-300 bg-osi-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-osi-cream-100 text-xs uppercase tracking-wide-label opacity-70">
            <tr>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Slug</th>
              <th className="px-4 py-2">Template</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr key={page.id} className="border-t border-osi-sand-300">
                <td className="px-4 py-2">
                  <Link href={`/admin/pages/${page.id}`} className="font-medium hover:underline">
                    {page.title}
                  </Link>
                  {page.is_system && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide-label opacity-50">system</span>
                  )}
                </td>
                <td className="px-4 py-2 opacity-70">/{page.slug}</td>
                <td className="px-4 py-2 opacity-70">{page.template}</td>
                <td className="px-4 py-2">
                  <span
                    className={
                      page.status === "published"
                        ? "rounded bg-green-100 px-2 py-0.5 text-xs text-green-800"
                        : "rounded bg-osi-sand-300/50 px-2 py-0.5 text-xs opacity-70"
                    }
                  >
                    {page.status}
                  </span>
                </td>
                <td className="px-4 py-2 opacity-50">{new Date(page.updated_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {pages.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center opacity-50">
                  No pages yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
