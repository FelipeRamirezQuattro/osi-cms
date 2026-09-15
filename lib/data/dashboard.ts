import { createServerDbClient } from "@/lib/db/client";

/**
 * Dashboard aggregate counts (Task 13a). Itemized per content type rather
 * than a single blended number — a "12 drafts awaiting publication" tile
 * with no breakdown would tell an editor there's work to do but not where,
 * and every one of these tables already has its own admin list screen to
 * link a per-type count straight to.
 */
export type DraftCounts = {
  pages: number;
  products: number;
  sharedSections: number;
  forms: number;
  total: number;
};

async function countDraftRows(table: "pages" | "products" | "shared_sections" | "form_definitions"): Promise<number> {
  const db = createServerDbClient();
  const { count, error } = await db.from(table).select("id", { count: "exact", head: true }).eq("status", "draft");
  if (error) throw error;
  return count ?? 0;
}

export async function countDraftsAwaitingPublication(): Promise<DraftCounts> {
  const [pages, products, sharedSections, forms] = await Promise.all([
    countDraftRows("pages"),
    countDraftRows("products"),
    countDraftRows("shared_sections"),
    countDraftRows("form_definitions"),
  ]);
  return { pages, products, sharedSections, forms, total: pages + products + sharedSections + forms };
}
