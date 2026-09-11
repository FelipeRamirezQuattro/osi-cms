import { getProductRelationOptionsAction } from "@/lib/actions/products";
import { ProductEditor } from "@/app/admin/(dashboard)/products/product-editor";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const relationOptions = await getProductRelationOptionsAction();
  return <ProductEditor product={null} relationOptions={relationOptions} />;
}
