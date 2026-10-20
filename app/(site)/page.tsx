import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPageBySlug } from "@/lib/data/pages";
import { BlockRenderer } from "@/components/blocks/block-renderer";
import { JsonLd } from "@/components/seo/json-ld";
import { cmsPageMetadata, getOrganizationJsonLd } from "@/lib/seo-server";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug("home");
  if (!page) return {};
  return cmsPageMetadata(page, "/");
}

export default async function HomePage() {
  const page = await getPageBySlug("home");
  if (!page) notFound();

  return (
    <>
      <BlockRenderer blocks={page.blocks} />
      {/* After the blocks, not before: Forge's header styling keys off the hero being main's :first-child. */}
      <JsonLd data={await getOrganizationJsonLd()} />
    </>
  );
}
