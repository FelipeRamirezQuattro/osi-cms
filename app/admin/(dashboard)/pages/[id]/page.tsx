import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getPageById, listPageRevisions } from "@/lib/data/pages";
import { getBlockPalette } from "@/lib/blocks/registry";
import { PageEditor } from "@/app/admin/(dashboard)/pages/[id]/page-editor";

export const dynamic = "force-dynamic";

export default async function EditPagePage({ params }: PageProps<"/admin/pages/[id]">) {
  // Already gated at the layout level for "is this staff at all" — read
  // again here for the *role*, which the editor UI needs to decide
  // whether to render Publish/Delete controls an editor session's own
  // requireCapability() calls would just redirect out of anyway.
  const session = await requireAdmin();
  const { id } = await params;
  const page = await getPageById(id);
  if (!page) notFound();

  const [palette, revisions] = await Promise.all([getBlockPalette(), listPageRevisions(id)]);

  return <PageEditor page={page} palette={palette} revisions={revisions} role={session.role} />;
}
