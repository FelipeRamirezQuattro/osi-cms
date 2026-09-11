import Link from "next/link";
import { listAllPages } from "@/lib/data/pages";
import { countNewSubmissions } from "@/lib/data/forms";

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
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-osi-sand-300 text-left opacity-60">
            <th className="py-2 font-normal">Title</th>
            <th className="font-normal">Slug</th>
            <th className="font-normal">Status</th>
            <th className="font-normal">Updated</th>
          </tr>
        </thead>
        <tbody>
          {recentPages.map((p) => (
            <tr key={p.id} className="border-b border-osi-sand-300/50">
              <td className="py-2">
                <Link href={`/admin/pages/${p.id}`} className="hover:underline">
                  {p.title}
                </Link>
              </td>
              <td className="opacity-70">/{p.slug}</td>
              <td className="capitalize opacity-70">{p.status}</td>
              <td className="opacity-70">{new Date(p.updated_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
