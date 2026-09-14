import { createServerDbClient } from "@/lib/db/client";
import type { Json, Tables } from "@/lib/db/database.types";

export type ProductDetail = Tables<"products"> & {
  product_benefits: Tables<"product_benefits">[];
  product_stages: Tables<"product_stages">[];
  product_specs: Tables<"product_specs">[];
  categorySlug: string | null;
};

export type ProductWithCategorySlug = Tables<"products"> & { categorySlug: string | null };

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

export async function listProductsWithCategorySlug(locale = "en"): Promise<ProductWithCategorySlug[]> {
  const db = createServerDbClient();
  const { data, error } = await db
    .from("products")
    .select("*, product_categories(slug)")
    .eq("locale", locale)
    .eq("status", "published")
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(({ product_categories, ...product }) => ({
    ...product,
    categorySlug: (product_categories as { slug: string } | null)?.slug ?? null,
  }));
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

// --- Admin ---

export type ProductAdminDetail = Tables<"products"> & {
  benefits: Tables<"product_benefits">[];
  stages: Tables<"product_stages">[];
  specs: Tables<"product_specs">[];
  industries: string[];
  applications: string[];
};

export async function listAllProducts(): Promise<Tables<"products">[]> {
  const db = createServerDbClient();
  const { data, error } = await db.from("products").select("*").order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getProductByIdAdmin(id: string): Promise<ProductAdminDetail | null> {
  const db = createServerDbClient();
  const { data: product, error } = await db.from("products").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!product) return null;

  const [benefits, stages, specs, industries, applications] = await Promise.all([
    db.from("product_benefits").select("*").eq("product_id", id).order("position", { ascending: true }),
    db.from("product_stages").select("*").eq("product_id", id).order("position", { ascending: true }),
    db.from("product_specs").select("*").eq("product_id", id).order("position", { ascending: true }),
    db.from("product_industries").select("industry_id").eq("product_id", id),
    db.from("product_applications").select("application_id").eq("product_id", id),
  ]);
  if (benefits.error) throw benefits.error;
  if (stages.error) throw stages.error;
  if (specs.error) throw specs.error;
  if (industries.error) throw industries.error;
  if (applications.error) throw applications.error;

  return {
    ...product,
    benefits: benefits.data ?? [],
    stages: stages.data ?? [],
    specs: specs.data ?? [],
    industries: (industries.data ?? []).map((r) => r.industry_id),
    applications: (applications.data ?? []).map((r) => r.application_id),
  };
}

type BenefitInput = { title: string; body?: string | null; icon_key?: string | null };
type StageInput = { title: string; body?: string | null; image_url?: string | null };
type SpecInput = { label: string; value: string; unit?: string | null };

/**
 * Atomically creates (p_product_id: null) or updates a product row and
 * fully replaces all 5 child/junction tables (product_benefits/
 * product_stages/product_specs/product_industries/product_applications)
 * inside one `security definer` SQL function body — see
 * supabase/migrations/0022_product_and_reorder_atomic.sql. Replaces the
 * old createProductRow/updateProductRow/saveProductChildren trio, which
 * did the same work as separate, unguarded statements on the caller's
 * own session client (flagged in Task 4's review: a failure partway
 * through, or an RLS change alone, could leave a product with some
 * children deleted and never reinserted). The RPC checks
 * has_capability('edit_drafts') and calls record_audit itself, so no
 * separate recordAudit call is needed at this call site.
 */
export async function saveProduct(
  productId: string | null,
  meta: Record<string, unknown>,
  benefits: BenefitInput[],
  stages: StageInput[],
  specs: SpecInput[],
  industryIds: string[],
  applicationIds: string[],
): Promise<string> {
  const db = createServerDbClient();
  const { data, error } = await db.rpc("save_product_atomic", {
    p_product_id: productId,
    p_meta: meta as unknown as Json,
    p_benefits: benefits as unknown as Json,
    p_stages: stages as unknown as Json,
    p_specs: specs as unknown as Json,
    p_industry_ids: industryIds as unknown as Json,
    p_application_ids: applicationIds as unknown as Json,
  });
  if (error) throw error;
  return data;
}

/**
 * Atomically deletes a product row (its child/junction tables cascade —
 * ON DELETE CASCADE, migration 0003 — already made that part a single,
 * inherently atomic statement) and records the audit entry in the same
 * transaction, checking has_capability('delete_content') independently
 * of RLS — same pattern as delete_page_atomic.
 */
export async function deleteProduct(id: string): Promise<void> {
  const db = createServerDbClient();
  const { error } = await db.rpc("delete_product_atomic", { p_product_id: id });
  if (error) throw error;
}
