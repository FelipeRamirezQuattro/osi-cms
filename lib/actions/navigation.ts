"use server";

import { requireCapability } from "@/lib/auth";
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
import { formatZodError } from "@/lib/validation/common";
import { navItemCreateSchema, navItemUpdateSchema } from "@/lib/validation/navigation";

export type NavMenuKey = Tables<"nav_menus">["key"];

export async function listNavMenusAction(): Promise<Tables<"nav_menus">[]> {
  await requireCapability("manage_navigation");
  return listNavMenusAdmin();
}

export async function getMenuItemsAction(key: NavMenuKey): Promise<{ menu: Tables<"nav_menus">; items: Tables<"nav_items">[] }> {
  await requireCapability("manage_navigation");
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
  await requireCapability("manage_navigation");
  const parsed = navItemCreateSchema.safeParse(input);
  if (!parsed.success) throw new Error(formatZodError(parsed.error).message);
  await createNavItem(parsed.data);
}

export async function updateNavItemAction(
  id: string,
  input: { label: string; href: string; badge?: string | null; is_external: boolean; parent_id: string | null },
): Promise<void> {
  await requireCapability("manage_navigation");
  const parsed = navItemUpdateSchema.safeParse(input);
  if (!parsed.success) throw new Error(formatZodError(parsed.error).message);
  await updateNavItem(id, parsed.data);
}

export async function deleteNavItemAction(id: string): Promise<void> {
  await requireCapability("manage_navigation");
  await deleteNavItem(id);
}

export async function moveNavItemAction(id: string, direction: "up" | "down"): Promise<void> {
  await requireCapability("manage_navigation");
  await moveNavItem(id, direction);
}
