import { createServerDbClient } from "@/lib/db/client";
import { recordAudit } from "@/lib/data/audit";
import { listProductsWithCategorySlug } from "@/lib/data/products";
import { productHref } from "@/lib/routes";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/db/database.types";

export type NavItemNode = Tables<"nav_items"> & { children: NavItemNode[] };

function nestItems(items: Tables<"nav_items">[]): NavItemNode[] {
  const byId = new Map<string, NavItemNode>(items.map((item) => [item.id, { ...item, children: [] }]));
  const roots: NavItemNode[] = [];
  for (const item of byId.values()) {
    if (item.parent_id && byId.has(item.parent_id)) {
      byId.get(item.parent_id)!.children.push(item);
    } else {
      roots.push(item);
    }
  }
  return roots;
}

export async function getNavMenu(key: Tables<"nav_menus">["key"]): Promise<NavItemNode[]> {
  const db = createServerDbClient();

  const { data: menu, error: menuError } = await db
    .from("nav_menus")
    .select("id")
    .eq("key", key)
    .maybeSingle();
  if (menuError) throw menuError;
  if (!menu) return [];

  const { data: items, error: itemsError } = await db
    .from("nav_items")
    .select("*")
    .eq("menu_id", menu.id)
    .order("position", { ascending: true });
  if (itemsError) throw itemsError;

  const nested = nestItems(items ?? []);
  if (key !== "mega") return nested;

  // The legacy mega-menu names more products than the client has
  // published content for. Keep those names in the CMS, but never expose
  // a public link that resolves to the not-found boundary. As products
  // are published they appear automatically, without another code edit.
  const products = await listProductsWithCategorySlug();
  const publishedProductHrefs = new Set(
    products
      .filter((product) => product.categorySlug)
      .map((product) => productHref(product.categorySlug!, product.slug)),
  );

  return nested.map((column) => ({
    ...column,
    children: column.children.filter(
      (child) => !child.href.startsWith("/products/") || publishedProductHrefs.has(child.href),
    ),
  }));
}

// --- Admin ---
// The admin UI only supports one level of nesting (top-level items +
// direct children) — matches every real menu seeded by
// scripts/seed-navigation.ts; the schema technically allows deeper
// trees via parent_id, but nothing in this project's content needs that.

export async function listNavMenusAdmin(): Promise<Tables<"nav_menus">[]> {
  const db = createServerDbClient();
  const { data, error } = await db.from("nav_menus").select("*").order("key", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getOrCreateNavMenu(key: Tables<"nav_menus">["key"]): Promise<Tables<"nav_menus">> {
  const db = createServerDbClient();
  const { data: existing, error } = await db.from("nav_menus").select("*").eq("key", key).maybeSingle();
  if (error) throw error;
  if (existing) return existing;

  const { data: created, error: createError } = await db.from("nav_menus").insert({ key }).select("*").single();
  if (createError) throw createError;
  return created;
}

export async function listNavItemsAdmin(menuId: string): Promise<Tables<"nav_items">[]> {
  const db = createServerDbClient();
  const { data, error } = await db
    .from("nav_items")
    .select("*")
    .eq("menu_id", menuId)
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createNavItem(input: TablesInsert<"nav_items">): Promise<Tables<"nav_items">> {
  const db = createServerDbClient();
  const { data, error } = await db.from("nav_items").insert(input).select("*").single();
  if (error) throw error;
  await recordAudit("create", "nav_item", data.id, { label: data.label, href: data.href });
  return data;
}

export async function updateNavItem(id: string, input: TablesUpdate<"nav_items">): Promise<void> {
  const db = createServerDbClient();
  const { error } = await db.from("nav_items").update(input).eq("id", id);
  if (error) throw error;
  await recordAudit("update", "nav_item", id, { label: input.label, href: input.href });
}

export async function deleteNavItem(id: string): Promise<void> {
  const db = createServerDbClient();
  const { data: existing } = await db.from("nav_items").select("label, href").eq("id", id).maybeSingle();
  const { error } = await db.from("nav_items").delete().eq("id", id);
  if (error) throw error;
  await recordAudit("delete", "nav_item", id, { label: existing?.label, href: existing?.href });
}

/**
 * Swaps `position` with the next/previous sibling (same menu + same
 * parent). The sibling lookup here is necessarily a separate read, but
 * the actual swap goes through swap_nav_item_position
 * (0022_product_and_reorder_atomic.sql) rather than two sequential
 * updateNavItem calls — a transaction, plus one audit entry, instead of
 * two unguarded updates and (if it went through updateNavItem) two
 * spurious "update" audit rows for what is really one reorder.
 */
export async function moveNavItem(id: string, direction: "up" | "down"): Promise<void> {
  const db = createServerDbClient();
  const { data: item, error } = await db.from("nav_items").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!item) return;

  let siblingsQuery = db
    .from("nav_items")
    .select("*")
    .eq("menu_id", item.menu_id)
    .order("position", { ascending: true });
  siblingsQuery = item.parent_id ? siblingsQuery.eq("parent_id", item.parent_id) : siblingsQuery.is("parent_id", null);
  const { data: siblings, error: siblingsError } = await siblingsQuery;
  if (siblingsError) throw siblingsError;

  const index = (siblings ?? []).findIndex((s) => s.id === id);
  if (index === -1) return;
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= (siblings ?? []).length) return;

  const a = siblings![index];
  const b = siblings![swapIndex];
  const { error: swapError } = await db.rpc("swap_nav_item_position", { p_id_a: a.id, p_id_b: b.id });
  if (swapError) throw swapError;
}
