import { createServerDbClient } from "@/lib/db/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/db/database.types";

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

export async function createProductRow(meta: TablesInsert<"products">): Promise<Tables<"products">> {
  const db = createServerDbClient();
  const { data, error } = await db.from("products").insert(meta).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateProductRow(id: string, meta: TablesUpdate<"products">): Promise<void> {
  const db = createServerDbClient();
  const { error } = await db.from("products").update(meta).eq("id", id);
  if (error) throw error;
}

export async function deleteProductRow(id: string): Promise<void> {
  const db = createServerDbClient();
  const { error } = await db.from("products").delete().eq("id", id);
  if (error) throw error;
}

type BenefitInput = { title: string; body?: string | null; icon_key?: string | null };
type StageInput = { title: string; body?: string | null; image_url?: string | null };
type SpecInput = { label: string; value: string; unit?: string | null };

/** Delete-then-insert for every child/junction table — same pattern as savePageDraft's blocks. */
export async function saveProductChildren(
  productId: string,
  benefits: BenefitInput[],
  stages: StageInput[],
  specs: SpecInput[],
  industryIds: string[],
  applicationIds: string[],
): Promise<void> {
  const db = createServerDbClient();

  await db.from("product_benefits").delete().eq("product_id", productId);
  if (benefits.length > 0) {
    const { error } = await db
      .from("product_benefits")
      .insert(benefits.map((b, i) => ({ ...b, product_id: productId, position: i })));
    if (error) throw error;
  }

  await db.from("product_stages").delete().eq("product_id", productId);
  if (stages.length > 0) {
    const { error } = await db
      .from("product_stages")
      .insert(stages.map((s, i) => ({ ...s, product_id: productId, position: i })));
    if (error) throw error;
  }

  await db.from("product_specs").delete().eq("product_id", productId);
  if (specs.length > 0) {
    const { error } = await db
      .from("product_specs")
      .insert(specs.map((s, i) => ({ ...s, product_id: productId, position: i })));
    if (error) throw error;
  }

  await db.from("product_industries").delete().eq("product_id", productId);
  if (industryIds.length > 0) {
    const { error } = await db
      .from("product_industries")
      .insert(industryIds.map((industry_id) => ({ product_id: productId, industry_id })));
    if (error) throw error;
  }

  await db.from("product_applications").delete().eq("product_id", productId);
  if (applicationIds.length > 0) {
    const { error } = await db
      .from("product_applications")
      .insert(applicationIds.map((application_id) => ({ product_id: productId, application_id })));
    if (error) throw error;
  }
}
