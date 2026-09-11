import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getPageBySlugForPreview } from "@/lib/data/pages";
import { BlockRenderer } from "@/components/blocks/block-renderer";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PreviewPage({ params }: PageProps<"/preview/[...slug]">) {
  await requireAdmin();
  const { slug } = await params;
  const page = await getPageBySlugForPreview(slug.join("/"));
  if (!page) notFound();

  return (
    <div>
      <div className="bg-osi-gold-500 px-4 py-2 text-center text-xs uppercase tracking-wide-label text-osi-navy-900">
        Preview — {page.status === "published" ? "published" : "draft"} — reflects the last saved draft, not
        unsaved edits
      </div>
      <BlockRenderer blocks={page.blocks} />
    </div>
  );
}
