import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getProductAction, getProductRelationOptionsAction } from "@/lib/actions/products";
import { ProductEditor } from "@/app/admin/(dashboard)/products/product-editor";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  const session = await requireAdmin();
  const { id } = await params;
  const [product, relationOptions] = await Promise.all([getProductAction(id), getProductRelationOptionsAction()]);
  if (!product) notFound();

  return <ProductEditor product={product} relationOptions={relationOptions} role={session.role} />;
}
