import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPageBySlug } from "@/lib/data/pages";
import { BlockRenderer } from "@/components/blocks/block-renderer";
import { cmsPageMetadata } from "@/lib/seo-server";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug("products");
  if (!page) return {};
  return cmsPageMetadata(page, "/products");
}

export default async function ProductsPage() {
  const page = await getPageBySlug("products");
  if (!page) notFound();

  return <BlockRenderer blocks={page.blocks} />;
}
