import type { Metadata } from "next";
import { listResources } from "@/lib/data/resources";
import { listProducts } from "@/lib/data/products";
import { Section } from "@/components/ui/section";
import { ResourcesFilterClient, type ResourceItem } from "@/app/(site)/resources/resources-filter-client";
import { ArrowButton } from "@/components/ui/arrow-button";
import { EmptyState, Eyebrow } from "@/components/ui/public-primitives";

export const metadata: Metadata = {
  title: "Resources",
  description: "Brochures, datasheets, certificates, and manuals from Odessa Separator Inc.",
};

export default async function ResourcesPage() {
  const [resources, products] = await Promise.all([listResources(), listProducts()]);
  const productNameById = new Map(products.map((p) => [p.id, p.name]));

  const items: ResourceItem[] = resources.map((r) => ({
    id: r.id,
    title: r.title,
    kind: r.kind,
    category: r.category,
    fileUrl: r.file_url,
    productName: r.product_id ? (productNameById.get(r.product_id) ?? null) : null,
  }));

  return (
    <Section background="cream" spacingTop="lg" spacingBottom="lg">
      <Eyebrow className="mb-3">Knowledge center</Eyebrow>
      <h1 className="mb-10 font-editorial text-[clamp(2.25rem,6vw,4.5rem)] font-semibold leading-none text-balance">Resources</h1>

      {items.length > 0 ? (
        <ResourcesFilterClient resources={items} />
      ) : (
        <EmptyState
          title="The resource library is being prepared"
          description="Brochures, datasheets, certificates, and manuals will appear here when they are published. In the meantime, explore OSI products or contact a specialist."
          action={<ArrowButton href="/products" variant="outline-dark">Explore products</ArrowButton>}
        />
      )}
    </Section>
  );
}
