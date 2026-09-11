import { createServerDbClient } from "@/lib/db/client";
import type { Tables } from "@/lib/db/database.types";

export async function getSiteSettings(): Promise<Tables<"site_settings">> {
  const db = createServerDbClient();
  const { data, error } = await db.from("site_settings").select("*").single();
  if (error) throw error;
  return data;
}
