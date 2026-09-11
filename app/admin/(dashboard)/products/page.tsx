import { listProductsAction } from "@/lib/actions/products";
import { listProductCategories } from "@/lib/data/taxonomy";
import { ProductsList } from "@/app/admin/(dashboard)/products/products-list";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const [products, categories] = await Promise.all([listProductsAction(), listProductCategories()]);
  const categoryNames = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  return <ProductsList products={products} categoryNames={categoryNames} />;
}
