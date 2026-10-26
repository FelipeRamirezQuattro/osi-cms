import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getProductBySlug, listRelatedProducts } from "@/lib/data/products";
import { listResourcesForProduct } from "@/lib/data/resources";
import { ProductDetailView } from "@/components/products/product-detail-view";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Staff-only review of a product that isn't published yet (drafts were
 * unreachable before — the public route only serves published rows). Gated
 * by requireAdmin() like /preview/[...slug]; this literal route wins over
 * that catch-all for /preview/products/...
 */
export default async function ProductPreviewPage({
  params,
}: PageProps<"/preview/products/[category]/[slug]">) {
  await requireAdmin();
  const { category, slug } = await params;
  const product = await getProductBySlug(slug, "en", { includeUnpublished: true });
  if (!product || product.categorySlug !== category) notFound();

  const [relatedProducts, resources] = await Promise.all([
    listRelatedProducts(product.id),
    listResourcesForProduct(product.id),
  ]);

  return (
    <div data-product-page>
      <div className="bg-osi-gold-500 px-4 py-2 text-center text-xs uppercase tracking-wide-label text-osi-navy-900">
        Preview — {product.status} — staff only; visitors see this product only once it is published
      </div>
      <ProductDetailView product={product} relatedProducts={relatedProducts} resources={resources} isPreview />
    </div>
  );
}
