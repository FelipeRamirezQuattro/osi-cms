import { createServerDbClient } from "@/lib/db/client";
import type { Tables } from "@/lib/db/database.types";

export async function listResources(category?: string): Promise<Tables<"resources">[]> {
  const db = createServerDbClient();
  let query = db
    .from("resources")
    .select("*")
    .eq("status", "published")
    .order("position", { ascending: true });
  if (category) {
    query = query.eq("category", category);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listResourcesForProduct(productId: string): Promise<Tables<"resources">[]> {
  const db = createServerDbClient();
  const { data, error } = await db
    .from("resources")
    .select("*")
    .eq("product_id", productId)
    .eq("status", "published")
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
