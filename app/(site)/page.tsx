import { notFound } from "next/navigation";
import { getPageBySlug } from "@/lib/data/pages";
import { BlockRenderer } from "@/components/blocks/block-renderer";

export default async function HomePage() {
  const page = await getPageBySlug("home");
  if (!page) notFound();

  return <BlockRenderer blocks={page.blocks} />;
}
