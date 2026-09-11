import { createServerDbClient } from "@/lib/db/client";
import type { Json, Tables } from "@/lib/db/database.types";

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

/**
 * Renders a page regardless of status, for the admin-only preview route
 * (app/(site)/preview/[...slug]/page.tsx) — access is gated by
 * requireAdmin() there, not by a signed token, since the viewer is always
 * an already-authenticated staff session. Revisit with a real signed-
 * token mechanism if the client wants to share unauthenticated preview
 * links with outside stakeholders.
 */
export async function getPageBySlugForPreview(slug: string, locale = "en"): Promise<PageWithBlocks | null> {
  const db = createServerDbClient();

  const { data: page, error } = await db
    .from("pages")
    .select("*")
    .eq("slug", slug)
    .eq("locale", locale)
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

// --- Admin (relies on RLS: an authenticated staff session sees every
// status, not just 'published' — see is_staff() in the migrations). ---

export async function listAllPages(): Promise<Tables<"pages">[]> {
  const db = createServerDbClient();
  const { data, error } = await db
    .from("pages")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getPageById(id: string): Promise<PageWithBlocks | null> {
  const db = createServerDbClient();
  const { data: page, error } = await db.from("pages").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!page) return null;

  const { data: blocks, error: blocksError } = await db
    .from("page_blocks")
    .select("*")
    .eq("page_id", page.id)
    .order("position", { ascending: true });
  if (blocksError) throw blocksError;

  return { ...page, blocks: blocks ?? [] };
}

export type PageMeta = Pick<
  Tables<"pages">,
  "slug" | "locale" | "title" | "template" | "seo_title" | "seo_description" | "og_image_url" | "noindex"
>;

export type BlockInput = { type: string; is_visible: boolean; data: Record<string, unknown> };

export async function createPage(input: PageMeta): Promise<Tables<"pages">> {
  const db = createServerDbClient();
  const { data, error } = await db.from("pages").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function duplicatePage(id: string, newSlug: string): Promise<Tables<"pages">> {
  const source = await getPageById(id);
  if (!source) throw new Error("Page not found");

  const db = createServerDbClient();
  const { blocks, id: _id, created_at, updated_at, published_at, status, is_system, ...meta } = source;
  void _id;
  void created_at;
  void updated_at;
  void published_at;
  void status;
  void is_system;

  const { data: page, error } = await db
    .from("pages")
    .insert({ ...meta, slug: newSlug, status: "draft" })
    .select("*")
    .single();
  if (error) throw error;

  if (blocks.length > 0) {
    const { error: blocksError } = await db.from("page_blocks").insert(
      blocks.map((b) => ({
        page_id: page.id,
        type: b.type,
        position: b.position,
        is_visible: b.is_visible,
        data: b.data,
      })),
    );
    if (blocksError) throw blocksError;
  }

  return page;
}

export async function deletePage(id: string): Promise<void> {
  const db = createServerDbClient();
  const { error } = await db.from("pages").delete().eq("id", id);
  if (error) throw error;
}

/** Replaces page metadata + the full block list (delete-then-insert — no concurrent-editor support). */
export async function savePageDraft(id: string, meta: PageMeta, blocks: BlockInput[]): Promise<void> {
  const db = createServerDbClient();

  const { error: metaError } = await db.from("pages").update(meta).eq("id", id);
  if (metaError) throw metaError;

  const { error: deleteError } = await db.from("page_blocks").delete().eq("page_id", id);
  if (deleteError) throw deleteError;

  if (blocks.length > 0) {
    const { error: insertError } = await db.from("page_blocks").insert(
      blocks.map((b, index) => ({
        page_id: id,
        type: b.type,
        position: index,
        is_visible: b.is_visible,
        data: b.data as Json,
      })),
    );
    if (insertError) throw insertError;
  }
}

export async function publishPage(id: string, userId: string): Promise<void> {
  const page = await getPageById(id);
  if (!page) throw new Error("Page not found");

  const db = createServerDbClient();
  // search_vector is a generated column (migration 0016) — not
  // Json-serializable (tsvector has no TS representation) and not
  // meaningful to snapshot anyway, since restoring just re-derives it
  // from title/seo_description.
  const { blocks, search_vector: _searchVector, ...meta } = page;
  void _searchVector;

  const { error: revisionError } = await db.from("page_revisions").insert({
    page_id: id,
    snapshot: { meta, blocks },
    created_by: userId,
  });
  if (revisionError) throw revisionError;

  const { error } = await db
    .from("pages")
    .update({ status: "published", published_at: new Date().toISOString(), updated_by: userId })
    .eq("id", id);
  if (error) throw error;
}

export async function unpublishPage(id: string): Promise<void> {
  const db = createServerDbClient();
  const { error } = await db.from("pages").update({ status: "draft" }).eq("id", id);
  if (error) throw error;
}

export async function listPageRevisions(pageId: string): Promise<Tables<"page_revisions">[]> {
  const db = createServerDbClient();
  const { data, error } = await db
    .from("page_revisions")
    .select("*")
    .eq("page_id", pageId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

export async function restorePageRevision(pageId: string, revisionId: string): Promise<void> {
  const db = createServerDbClient();
  const { data: revision, error } = await db
    .from("page_revisions")
    .select("snapshot")
    .eq("id", revisionId)
    .eq("page_id", pageId)
    .single();
  if (error) throw error;

  const snapshot = revision.snapshot as { meta: PageMeta; blocks: Tables<"page_blocks">[] };
  await savePageDraft(
    pageId,
    snapshot.meta,
    snapshot.blocks.map((b) => ({ type: b.type, is_visible: b.is_visible, data: b.data as Record<string, unknown> })),
  );
}
