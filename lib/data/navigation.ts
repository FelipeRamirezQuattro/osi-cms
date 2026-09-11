import { createServerDbClient } from "@/lib/db/client";
import type { Tables } from "@/lib/db/database.types";

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

  return nestItems(items ?? []);
}
