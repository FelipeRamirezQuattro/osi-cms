import { notFound } from "next/navigation";
import { getProductAction, getProductRelationOptionsAction } from "@/lib/actions/products";
import { ProductEditor } from "@/app/admin/(dashboard)/products/product-editor";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  const [product, relationOptions] = await Promise.all([getProductAction(id), getProductRelationOptionsAction()]);
  if (!product) notFound();

  return <ProductEditor product={product} relationOptions={relationOptions} />;
}
