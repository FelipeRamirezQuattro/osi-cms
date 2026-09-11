import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPageBySlug } from "@/lib/data/pages";
import { BlockRenderer } from "@/components/blocks/block-renderer";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug("contact");
  return { title: page?.seo_title ?? page?.title, description: page?.seo_description ?? undefined };
}

export default async function ContactPage() {
  const page = await getPageBySlug("contact");
  if (!page) notFound();

  return <BlockRenderer blocks={page.blocks} />;
}
