import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getApplicationBySlug, listProductsByApplication } from "@/lib/data/taxonomy";
import { Section } from "@/components/ui/section";
import { LabelPlateGrid } from "@/components/blocks/label-plate-grid";
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { absoluteUrl } from "@/lib/seo";
import { applicationHref, productHref } from "@/lib/routes";

// Same shape as app/(site)/industries/[slug]/page.tsx, joined through
// product_applications instead of product_industries — see Task 8 item #5.

export async function generateMetadata({
  params,
}: PageProps<"/applications/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const application = await getApplicationBySlug(slug);
  if (!application) return {};
  return {
    title: application.name,
    description: application.description ?? undefined,
  };
}

export default async function ApplicationDetailPage({ params }: PageProps<"/applications/[slug]">) {
  const { slug } = await params;
  const application = await getApplicationBySlug(slug);
  if (!application) notFound();

  const products = await listProductsByApplication(application.id);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: absoluteUrl("/") },
          { name: "Products", url: absoluteUrl("/products") },
          { name: application.name, url: absoluteUrl(applicationHref(application.slug)) },
        ])}
      />
      <Section background="navy" spacingTop="lg" spacingBottom="md">
        <p className="mb-4 font-display text-small-label tracking-wide-label text-osi-gold-500 uppercase">
          Application
        </p>
        <h1 className="font-display text-section tracking-tightest-display uppercase">{application.name}</h1>
        {application.description && <p className="mt-4 max-w-2xl text-osi-slate-200">{application.description}</p>}
      </Section>
      <Section background="cream" spacingTop="md" spacingBottom="lg">
        <h2 className="mb-8 font-display text-card-label tracking-wide-display uppercase">
          Products for {application.name}
        </h2>
        {products.length > 0 ? (
          <LabelPlateGrid
            items={products.map((p) => ({
              title: p.name,
              body: p.summary ?? undefined,
              href: p.categorySlug ? productHref(p.categorySlug, p.slug) : "/products",
            }))}
          />
        ) : (
          <p className="text-sm text-osi-slate-400">
            No published products are linked to this application yet — check back soon, or browse the full{" "}
            <Link href="/products" className="underline underline-offset-4">
              product catalog
            </Link>
            .
          </p>
        )}
      </Section>
    </>
  );
}
