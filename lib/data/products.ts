import { createServerDbClient } from "@/lib/db/client";
import type { Tables } from "@/lib/db/database.types";

export type ProductDetail = Tables<"products"> & {
  product_benefits: Tables<"product_benefits">[];
  product_stages: Tables<"product_stages">[];
  product_specs: Tables<"product_specs">[];
  categorySlug: string | null;
};

export async function listProducts(locale = "en"): Promise<Tables<"products">[]> {
  const db = createServerDbClient();
  const { data, error } = await db
    .from("products")
    .select("*")
    .eq("locale", locale)
    .eq("status", "published")
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listProductsByCategory(
  categorySlug: string,
  locale = "en",
): Promise<Tables<"products">[]> {
  const db = createServerDbClient();
  const { data, error } = await db
    .from("products")
    .select("*, product_categories!inner(slug)")
    .eq("product_categories.slug", categorySlug)
    .eq("locale", locale)
    .eq("status", "published")
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getProductBySlug(
  slug: string,
  locale = "en",
): Promise<ProductDetail | null> {
  const db = createServerDbClient();
  const { data, error } = await db
    .from("products")
    .select(
      "*, product_benefits(*), product_stages(*), product_specs(*), product_categories(slug)",
    )
    .eq("slug", slug)
    .eq("locale", locale)
    .eq("status", "published")
    .order("position", { referencedTable: "product_benefits", ascending: true })
    .order("position", { referencedTable: "product_stages", ascending: true })
    .order("position", { referencedTable: "product_specs", ascending: true })
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { product_categories, ...product } = data;
  return {
    ...product,
    categorySlug: (product_categories as { slug: string } | null)?.slug ?? null,
  };
}
