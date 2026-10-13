import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getProductAction, getProductRelationOptionsAction } from "@/lib/actions/products";
import { getBlockPalette } from "@/lib/blocks/registry";
import { getPublishedBranding } from "@/lib/data/branding";
import { OSI_SEED_BRANDING_CONFIG } from "@/lib/branding/seed";
import { PublishedBrandingOptionsProvider } from "@/components/admin/block-appearance-fields";
import { ProductEditor } from "@/app/admin/(dashboard)/products/product-editor";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  const session = await requireAdmin();
  const { id } = await params;
  const [product, relationOptions, branding] = await Promise.all([
    getProductAction(id),
    getProductRelationOptionsAction(id),
    getPublishedBranding(),
  ]);
  if (!product) notFound();

  return (
    <PublishedBrandingOptionsProvider branding={branding?.config ?? OSI_SEED_BRANDING_CONFIG}>
      <ProductEditor product={product} relationOptions={relationOptions} palette={getBlockPalette()} role={session.role} />
    </PublishedBrandingOptionsProvider>
  );
}
