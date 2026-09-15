import Link from "next/link";
import { listFormDefinitionsAction } from "@/lib/actions/forms";

export const dynamic = "force-dynamic";

export default async function AdminFormsListPage() {
  const definitions = await listFormDefinitionsAction();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-lg tracking-wide-display uppercase">Forms</h1>
        <Link
          href="/admin/forms/new"
          className="rounded bg-osi-navy-900 px-4 py-2 text-xs uppercase tracking-wide-label text-osi-white"
        >
          New form
        </Link>
      </div>

      <p className="max-w-2xl text-sm opacity-70">
        Build any form (contact request, quote request, newsletter signup, etc.) without code — add it to a page
        with the &quot;Form&quot; block, using this form&apos;s key. The site&apos;s dedicated contact form is
        managed separately, via the &quot;Contact form&quot; block.
      </p>

      <div className="overflow-hidden rounded border border-osi-sand-300 bg-osi-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-osi-cream-100 text-xs uppercase tracking-wide-label opacity-70">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Form key</th>
              <th className="px-4 py-2">Fields</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {definitions.map((definition) => (
              <tr key={definition.id} className="border-t border-osi-sand-300">
                <td className="px-4 py-2">
                  <Link href={`/admin/forms/${definition.id}`} className="font-medium hover:underline">
                    {definition.name}
                  </Link>
                </td>
                <td className="px-4 py-2 opacity-70">{definition.form_key}</td>
                <td className="px-4 py-2 opacity-70">
                  {Array.isArray(definition.fields) ? definition.fields.length : 0}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={
                      definition.status === "published"
                        ? "rounded bg-green-100 px-2 py-0.5 text-xs text-green-800"
                        : "rounded bg-osi-sand-300/50 px-2 py-0.5 text-xs opacity-70"
                    }
                  >
                    {definition.status}
                  </span>
                </td>
                <td className="px-4 py-2 opacity-50">{new Date(definition.updated_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {definitions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center opacity-50">
                  No forms yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
