import { getProductRelationOptionsAction } from "@/lib/actions/products";
import { getBlockPalette } from "@/lib/blocks/registry";
import { getPublishedBranding } from "@/lib/data/branding";
import { OSI_SEED_BRANDING_CONFIG } from "@/lib/branding/seed";
import { PublishedBrandingOptionsProvider } from "@/components/admin/block-appearance-fields";
import { ProductEditor } from "@/app/admin/(dashboard)/products/product-editor";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const [relationOptions, branding] = await Promise.all([getProductRelationOptionsAction(), getPublishedBranding()]);
  return (
    <PublishedBrandingOptionsProvider branding={branding?.config ?? OSI_SEED_BRANDING_CONFIG}>
      <ProductEditor product={null} relationOptions={relationOptions} palette={getBlockPalette()} />
    </PublishedBrandingOptionsProvider>
  );
}
