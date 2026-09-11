import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPageBySlug } from "@/lib/data/pages";
import { BlockRenderer } from "@/components/blocks/block-renderer";

// Generalizes the master prompt §7 sitemap's "/[slug] catch-all for
// admin-created pages" to a multi-segment catch-all, so nested slugs
// (careers/hiring, hse/sg-sst-policies, services/machine-shop, etc.)
// resolve without a dedicated route file per page. See DECISIONS.md.

async function resolveSlug(params: Promise<{ slug: string[] }>) {
  const { slug } = await params;
  return slug.join("/");
}

export async function generateMetadata({
  params,
}: PageProps<"/[...slug]">): Promise<Metadata> {
  const page = await getPageBySlug(await resolveSlug(params));
  if (!page) return {};
  return {
    title: page.seo_title ?? page.title,
    description: page.seo_description ?? undefined,
    robots: page.noindex ? { index: false } : undefined,
  };
}

export default async function CatchAllPage({ params }: PageProps<"/[...slug]">) {
  const page = await getPageBySlug(await resolveSlug(params));
  if (!page) notFound();

  return <BlockRenderer blocks={page.blocks} />;
}
