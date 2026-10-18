import { createServerDbClient } from "@/lib/db/client";
import { recordAudit } from "@/lib/data/audit";
import { listAllProductsWithCategorySlug, listProductsWithCategorySlug } from "@/lib/data/products";
import { listAllPages } from "@/lib/data/pages";
import { pageHref, productHref } from "@/lib/routes";
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

  return resolveProductLinks(nestItems(items ?? []), key === "mega");
}

/**
 * Items that reference a product (`product_id`) link to that product's
 * *current* category + slug and hide while it isn't published — publishing a
 * product makes its menu entry appear, unpublishing hides it, and a category
 * change can't break the link. Plain items keep their stored href. As a last
 * safety net for hand-typed hrefs, a plain mega-menu `/products/…` link that
 * doesn't resolve to a published product is dropped rather than shown as a 404.
 */
async function resolveProductLinks(nodes: NavItemNode[], guardPlainProductHrefs: boolean): Promise<NavItemNode[]> {
  const referencesProduct = (list: NavItemNode[]): boolean =>
    list.some((node) => node.product_id !== null || referencesProduct(node.children));
  if (!guardPlainProductHrefs && !referencesProduct(nodes)) return nodes;

  const products = await listProductsWithCategorySlug();
  const hrefByProductId = new Map(
    products.filter((p) => p.categorySlug).map((p) => [p.id, productHref(p.categorySlug!, p.slug)]),
  );
  const publishedHrefs = new Set(hrefByProductId.values());

  const resolve = (list: NavItemNode[]): NavItemNode[] =>
    list.flatMap((node) => {
      const children = resolve(node.children);
      if (node.product_id) {
        const href = hrefByProductId.get(node.product_id);
        return href ? [{ ...node, href, children }] : [];
      }
      if (guardPlainProductHrefs && node.href.startsWith("/products/") && !publishedHrefs.has(node.href)) return [];
      return [{ ...node, children }];
    });
  return resolve(nodes);
}

export type LinkableResource = {
  id: string;
  label: string;
  href: string;
  group: "Page" | "Product";
  /** Products only: a link to an unpublished product stays hidden on the live site until it's published. */
  status?: string;
  /** Products only: the product's id, stored as nav_items.product_id when picked. */
  productId?: string;
};

/**
 * Real pages/products an editor can point a nav item at, for the admin nav
 * form's picker — replaces hand-typing (and mistyping) a slug. Published
 * only, matching this repo's "avoid broken links" pattern elsewhere (see
 * listProductsWithCategorySlug's status filter and getNavMenu's own mega-menu
 * published-product filtering above): an editor can still fall back to a
 * free-text URL for external links, "#" category headers, and anything not
 * modeled as a page/product.
 */
export async function listLinkableResourcesForNav(): Promise<LinkableResource[]> {
  const [pages, products] = await Promise.all([listAllPages(), listAllProductsWithCategorySlug()]);

  const pageResources: LinkableResource[] = pages
    .filter((page) => page.status === "published")
    .map((page) => ({ id: `page:${page.id}`, label: page.title, href: pageHref(page.slug), group: "Page" }));

  // Every product, drafts included: a menu entry can be set up before the
  // product is published and appears on its own once it is. Products without a
  // category can't form a URL yet, so they're left out of the picker.
  const productResources: LinkableResource[] = products
    .filter((product) => product.categorySlug)
    .map((product) => ({
      id: `product:${product.id}`,
      label: product.name,
      href: productHref(product.categorySlug!, product.slug),
      group: "Product",
      status: product.status,
      productId: product.id,
    }));

  return [...pageResources, ...productResources].sort((a, b) => a.label.localeCompare(b.label));
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
