"use server";

import { requireAdmin } from "@/lib/auth";
import {
  createNavItem,
  deleteNavItem,
  getOrCreateNavMenu,
  listNavItemsAdmin,
  listNavMenusAdmin,
  moveNavItem,
  updateNavItem,
} from "@/lib/data/navigation";
import type { Tables } from "@/lib/db/database.types";

export type NavMenuKey = Tables<"nav_menus">["key"];

export async function listNavMenusAction(): Promise<Tables<"nav_menus">[]> {
  await requireAdmin();
  return listNavMenusAdmin();
}

export async function getMenuItemsAction(key: NavMenuKey): Promise<{ menu: Tables<"nav_menus">; items: Tables<"nav_items">[] }> {
  await requireAdmin();
  const menu = await getOrCreateNavMenu(key);
  const items = await listNavItemsAdmin(menu.id);
  return { menu, items };
}

export async function createNavItemAction(input: {
  menu_id: string;
  parent_id: string | null;
  label: string;
  href: string;
  badge?: string | null;
  is_external: boolean;
}): Promise<void> {
  await requireAdmin();
  await createNavItem(input);
}

export async function updateNavItemAction(
  id: string,
  input: { label: string; href: string; badge?: string | null; is_external: boolean; parent_id: string | null },
): Promise<void> {
  await requireAdmin();
  await updateNavItem(id, input);
}

export async function deleteNavItemAction(id: string): Promise<void> {
  await requireAdmin();
  await deleteNavItem(id);
}

export async function moveNavItemAction(id: string, direction: "up" | "down"): Promise<void> {
  await requireAdmin();
  await moveNavItem(id, direction);
}
