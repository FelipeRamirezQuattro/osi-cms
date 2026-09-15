import { createServerDbClient } from "@/lib/db/client";
import type { Tables } from "@/lib/db/database.types";
import type { ProductWithCategorySlug } from "@/lib/data/products";

export async function listProductCategories(): Promise<Tables<"product_categories">[]> {
  const db = createServerDbClient();
  const { data, error } = await db
    .from("product_categories")
    .select("*")
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listIndustries(): Promise<Tables<"industries">[]> {
  const db = createServerDbClient();
  const { data, error } = await db
    .from("industries")
    .select("*")
    .eq("status", "published")
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listApplications(): Promise<Tables<"applications">[]> {
  const db = createServerDbClient();
  const { data, error } = await db
    .from("applications")
    .select("*")
    .eq("status", "published")
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getIndustryBySlug(slug: string): Promise<Tables<"industries"> | null> {
  const db = createServerDbClient();
  const { data, error } = await db
    .from("industries")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getApplicationBySlug(slug: string): Promise<Tables<"applications"> | null> {
  const db = createServerDbClient();
  const { data, error } = await db
    .from("applications")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Published products linked to a given industry via the product_industries
 * junction table — two separate queries (link rows, then the target
 * products), same pattern as lib/data/products.ts's listRelatedProducts:
 * PostgREST's embedded-select syntax works fine for a *single* FK per
 * junction table (unlike product_related's two FKs to the same table),
 * but going through the junction table this way keeps the query shape
 * identical across both taxonomy join functions below and avoids a
 * three-way embed (products -> product_industries -> industries) that
 * would return every product regardless of published status without an
 * extra !inner hint. Order is insertion order (no `position` column on
 * the junction table) — good enough for an unordered "products in this
 * industry" list.
 */
export async function listProductsByIndustry(industryId: string, locale = "en"): Promise<ProductWithCategorySlug[]> {
  const db = createServerDbClient();
  const { data: links, error: linksError } = await db
    .from("product_industries")
    .select("product_id")
    .eq("industry_id", industryId);
  if (linksError) throw linksError;
  if (!links || links.length === 0) return [];

  const ids = links.map((link) => link.product_id);
  const { data, error } = await db
    .from("products")
    .select("*, product_categories(slug)")
    .in("id", ids)
    .eq("status", "published")
    .eq("locale", locale)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(({ product_categories, ...product }) => ({
    ...product,
    categorySlug: (product_categories as { slug: string } | null)?.slug ?? null,
  }));
}

/** Same shape as listProductsByIndustry, joined through product_applications instead. */
export async function listProductsByApplication(
  applicationId: string,
  locale = "en",
): Promise<ProductWithCategorySlug[]> {
  const db = createServerDbClient();
  const { data: links, error: linksError } = await db
    .from("product_applications")
    .select("product_id")
    .eq("application_id", applicationId);
  if (linksError) throw linksError;
  if (!links || links.length === 0) return [];

  const ids = links.map((link) => link.product_id);
  const { data, error } = await db
    .from("products")
    .select("*, product_categories(slug)")
    .in("id", ids)
    .eq("status", "published")
    .eq("locale", locale)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(({ product_categories, ...product }) => ({
    ...product,
    categorySlug: (product_categories as { slug: string } | null)?.slug ?? null,
  }));
}
