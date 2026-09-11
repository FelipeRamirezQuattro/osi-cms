import { createServerDbClient } from "@/lib/db/client";
import type { Tables } from "@/lib/db/database.types";

export type PageWithBlocks = Tables<"pages"> & { blocks: Tables<"page_blocks">[] };

export async function getPageBySlug(slug: string, locale = "en"): Promise<PageWithBlocks | null> {
  const db = createServerDbClient();

  const { data: page, error } = await db
    .from("pages")
    .select("*")
    .eq("slug", slug)
    .eq("locale", locale)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  if (!page) return null;

  const { data: blocks, error: blocksError } = await db
    .from("page_blocks")
    .select("*")
    .eq("page_id", page.id)
    .eq("is_visible", true)
    .order("position", { ascending: true });
  if (blocksError) throw blocksError;

  return { ...page, blocks: blocks ?? [] };
}
