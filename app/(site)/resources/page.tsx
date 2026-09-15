import type { Metadata } from "next";
import { listResources } from "@/lib/data/resources";
import { listProducts } from "@/lib/data/products";
import { Section } from "@/components/ui/section";
import { ResourcesFilterClient, type ResourceItem } from "@/app/(site)/resources/resources-filter-client";

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
      <h1 className="mb-10 font-display text-section tracking-tightest-display uppercase">Resources</h1>

      {items.length > 0 ? (
        <ResourcesFilterClient resources={items} />
      ) : (
        <p className="text-sm text-osi-slate-400">
          Nothing published yet — brochures, datasheets, certificates, and manuals will appear here once available.
        </p>
      )}
    </Section>
  );
}
