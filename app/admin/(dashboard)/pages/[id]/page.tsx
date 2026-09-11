import { notFound } from "next/navigation";
import { getPageById, listPageRevisions } from "@/lib/data/pages";
import { getBlockPalette } from "@/lib/blocks/registry";
import { PageEditor } from "@/app/admin/(dashboard)/pages/[id]/page-editor";

export const dynamic = "force-dynamic";

export default async function EditPagePage({ params }: PageProps<"/admin/pages/[id]">) {
  const { id } = await params;
  const page = await getPageById(id);
  if (!page) notFound();

  const [palette, revisions] = await Promise.all([getBlockPalette(), listPageRevisions(id)]);

  return <PageEditor page={page} palette={palette} revisions={revisions} />;
}
