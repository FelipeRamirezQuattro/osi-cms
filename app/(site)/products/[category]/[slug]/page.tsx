import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug, listRelatedProducts } from "@/lib/data/products";
import { listResourcesForProduct } from "@/lib/data/resources";
import { buildPageMetadata } from "@/lib/seo";
import { resolveDescription } from "@/lib/seo-content";
import { resolveShareImage } from "@/lib/seo-server";
import { productHref } from "@/lib/routes";
import { ProductDetailView } from "@/components/products/product-detail-view";

// Product detail renders directly from products + its child tables
// (and its extra product_blocks) rather than through page_blocks — its
// structure is fixed/relational, not freeform CMS content. The body lives
// in ProductDetailView, shared with the staff draft preview. See
// docs/DECISIONS.md.

export async function generateMetadata({
  params,
}: PageProps<"/products/[category]/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  const { description } = resolveDescription(product.seo_description, () => product.summary ?? product.tagline);
  return buildPageMetadata({
    title: product.seo_title?.trim() || product.name,
    description,
    path: productHref(product.categorySlug ?? "", product.slug),
    image: await resolveShareImage(product.hero_image_url ?? product.diagram_image_url),
  });
}

export default async function ProductDetailPage({
  params,
}: PageProps<"/products/[category]/[slug]">) {
  const { category, slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || product.categorySlug !== category) notFound();

  const [relatedProducts, resources] = await Promise.all([
    listRelatedProducts(product.id),
    listResourcesForProduct(product.id),
  ]);

  return (
    // data-product-page switches off Forge's "01 / 02" section index here (it numbered some headings and not others).
    <div className="contents" data-product-page>
      <ProductDetailView product={product} relatedProducts={relatedProducts} resources={resources} />
    </div>
  );
}
