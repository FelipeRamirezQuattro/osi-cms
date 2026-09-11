import { createServerDbClient } from "@/lib/db/client";
import type { Tables } from "@/lib/db/database.types";

/**
 * Resolves the `redirects` table (legacy URL map, master prompt §7/§9)
 * against the catch-all route — checked only when no `pages` row matches
 * the slug, so a real CMS page always wins over a stale redirect entry.
 */
export async function getRedirectByPath(fromPath: string): Promise<Tables<"redirects"> | null> {
  const db = createServerDbClient();
  const { data, error } = await db.from("redirects").select("*").eq("from_path", fromPath).maybeSingle();
  if (error) throw error;
  return data;
}
