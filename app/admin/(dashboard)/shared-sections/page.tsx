import Link from "next/link";
import { listAllSharedSections } from "@/lib/data/shared-sections";

export const dynamic = "force-dynamic";

export default async function AdminSharedSectionsListPage() {
  const sections = await listAllSharedSections();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-lg tracking-wide-display uppercase">Shared sections</h1>
        <Link
          href="/admin/shared-sections/new"
          className="rounded bg-osi-navy-900 px-4 py-2 text-xs uppercase tracking-wide-label text-osi-white"
        >
          New shared section
        </Link>
      </div>

      <p className="max-w-2xl text-sm opacity-70">
        A reusable block sequence referenced by key from any page (via the &quot;Shared section&quot; block).
        Editing a shared section&apos;s blocks only affects live pages once you publish it here — same
        draft/publish separation as a page.
      </p>

      <div className="overflow-hidden rounded border border-osi-sand-300 bg-osi-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-osi-cream-100 text-xs uppercase tracking-wide-label opacity-70">
            <tr>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Key</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => (
              <tr key={section.id} className="border-t border-osi-sand-300">
                <td className="px-4 py-2">
                  <Link href={`/admin/shared-sections/${section.id}`} className="font-medium hover:underline">
                    {section.title}
                  </Link>
                </td>
                <td className="px-4 py-2 opacity-70">{section.key}</td>
                <td className="px-4 py-2">
                  <span
                    className={
                      section.status === "published"
                        ? "rounded bg-green-100 px-2 py-0.5 text-xs text-green-800"
                        : "rounded bg-osi-sand-300/50 px-2 py-0.5 text-xs opacity-70"
                    }
                  >
                    {section.status}
                  </span>
                </td>
                <td className="px-4 py-2 opacity-50">{new Date(section.updated_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {sections.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center opacity-50">
                  No shared sections yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
