import { createServerDbClient } from "@/lib/db/client";
import type { Tables } from "@/lib/db/database.types";

// news_posts holds both /news content and /blog content, split by `kind`.
// The /news readers below exclude blog posts so the two listings never mix.
const NEWS_KINDS = ["news", "conference", "event"];

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
  query = kind ? query.eq("kind", kind) : query.in("kind", NEWS_KINDS);
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
    .in("kind", NEWS_KINDS)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listBlogPosts(
  { tag }: { tag?: string } = {},
  locale = "en",
): Promise<Tables<"news_posts">[]> {
  const db = createServerDbClient();
  let query = db
    .from("news_posts")
    .select("*")
    .eq("locale", locale)
    .eq("status", "published")
    .eq("kind", "blog")
    .order("published_at", { ascending: false });
  if (tag) query = query.contains("tags", [tag]);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getBlogPostBySlug(
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
    .eq("kind", "blog")
    .maybeSingle();
  if (error) throw error;
  return data;
}
