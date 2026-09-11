import { createServerDbClient } from "@/lib/db/client";
import type { Tables } from "@/lib/db/database.types";

export async function listNewsPosts(
  kind?: Tables<"news_posts">["kind"],
  locale = "en",
): Promise<Tables<"news_posts">[]> {
  const db = createServerDbClient();
  let query = db
    .from("news_posts")
    .select("*")
    .eq("locale", locale)
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (kind) {
    query = query.eq("kind", kind);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getNewsPostBySlug(
  slug: string,
  locale = "en",
): Promise<Tables<"news_posts"> | null> {
  const db = createServerDbClient();
  const { data, error } = await db
    .from("news_posts")
    .select("*")
    .eq("slug", slug)
    .eq("locale", locale)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  return data;
}
