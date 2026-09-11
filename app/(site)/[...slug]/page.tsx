import { notFound, permanentRedirect, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getPageBySlug } from "@/lib/data/pages";
import { getSiteSettings } from "@/lib/data/settings";
import { getRedirectByPath } from "@/lib/data/redirects";
import { BlockRenderer } from "@/components/blocks/block-renderer";
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { absoluteUrl, resolveOgImage } from "@/lib/seo";

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
  const [page, settings] = await Promise.all([getPageBySlug(await resolveSlug(params)), getSiteSettings()]);
  if (!page) return {};
  const ogImage = resolveOgImage(page.og_image_url, settings.default_og_image);
  return {
    title: page.seo_title ?? page.title,
    description: page.seo_description ?? undefined,
    robots: page.noindex ? { index: false } : undefined,
    openGraph: ogImage ? { images: [ogImage] } : undefined,
  };
}

function segmentToLabel(segment: string): string {
  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function CatchAllPage({ params }: PageProps<"/[...slug]">) {
  const slug = await resolveSlug(params);
  const page = await getPageBySlug(slug);

  if (!page) {
    const redirectRow = await getRedirectByPath(`/${slug}`);
    if (redirectRow) {
      // next/navigation only distinguishes permanent (308) vs temporary
      // (307) redirects, not the full 301/302/307/308 range `redirects`
      // stores — 301/308 both read as "permanently moved" to a crawler,
      // which is what matters for the legacy URL map's SEO intent.
      if (redirectRow.status_code === 301 || redirectRow.status_code === 308) {
        permanentRedirect(redirectRow.to_path);
      }
      redirect(redirectRow.to_path);
    }
    notFound();
  }

  const segments = slug.split("/");
  const breadcrumbs = [
    { name: "Home", url: absoluteUrl("/") },
    ...segments.map((segment, index) => ({
      name: index === segments.length - 1 ? page.title : segmentToLabel(segment),
      url: absoluteUrl(`/${segments.slice(0, index + 1).join("/")}`),
    })),
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(breadcrumbs)} />
      <BlockRenderer blocks={page.blocks} />
    </>
  );
}
