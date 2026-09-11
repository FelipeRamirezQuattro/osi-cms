import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPageBySlug } from "@/lib/data/pages";
import { getSiteSettings } from "@/lib/data/settings";
import { BlockRenderer } from "@/components/blocks/block-renderer";
import { resolveOgImage } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [page, settings] = await Promise.all([getPageBySlug("products"), getSiteSettings()]);
  const ogImage = resolveOgImage(page?.og_image_url, settings.default_og_image);
  return {
    title: page?.seo_title ?? page?.title,
    description: page?.seo_description ?? undefined,
    openGraph: ogImage ? { images: [ogImage] } : undefined,
  };
}

export default async function ProductsPage() {
  const page = await getPageBySlug("products");
  if (!page) notFound();

  return <BlockRenderer blocks={page.blocks} />;
}
