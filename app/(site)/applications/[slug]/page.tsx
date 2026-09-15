import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getApplicationBySlug, listProductsByApplication } from "@/lib/data/taxonomy";
import { Section } from "@/components/ui/section";
import { LabelPlateGrid } from "@/components/blocks/label-plate-grid";
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { absoluteUrl } from "@/lib/seo";
import { applicationHref, productHref } from "@/lib/routes";
import { ArrowButton } from "@/components/ui/arrow-button";
import { EmptyState } from "@/components/ui/public-primitives";

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
        <p className="mb-4 text-xs font-semibold tracking-[0.1em] text-osi-gold-400 uppercase">
          Application
        </p>
        <h1 className="max-w-4xl font-editorial text-[clamp(2.25rem,6vw,4.5rem)] font-semibold leading-[1.05] text-balance [overflow-wrap:anywhere]">{application.name}</h1>
        {application.description && <p className="mt-5 max-w-[65ch] text-base leading-relaxed text-osi-slate-200">{application.description}</p>}
      </Section>
      <Section background="cream" spacingTop="md" spacingBottom="lg">
        <h2 className="mb-8 font-editorial text-section font-semibold text-balance">
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
          <EmptyState
            title="No products are linked yet"
            description="This application does not have published products assigned to it yet. Explore the complete catalog instead."
            action={<ArrowButton href="/products" variant="outline-dark">Browse products</ArrowButton>}
          />
        )}
      </Section>
    </>
  );
}
