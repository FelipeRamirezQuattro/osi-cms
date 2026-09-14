import { createServerDbClient } from "@/lib/db/client";
import type { Json, Tables } from "@/lib/db/database.types";

export type PageWithBlocks = Tables<"pages"> & { blocks: Tables<"page_blocks">[] };

type PublishedSnapshot = {
  meta: Tables<"pages">;
  blocks: Tables<"page_blocks">[];
};

function publicationToPage(
  publication: Pick<Tables<"page_publications">, "snapshot" | "published_at">,
): PageWithBlocks {
  const snapshot = publication.snapshot as unknown as PublishedSnapshot;
  return {
    ...snapshot.meta,
    status: "published",
    published_at: publication.published_at,
    blocks: snapshot.blocks.filter((block) => block.is_visible).sort((a, b) => a.position - b.position),
  };
}

export async function getPageBySlug(slug: string, locale = "en"): Promise<PageWithBlocks | null> {
  const db = createServerDbClient();

  const { data: publication, error } = await db
    .from("page_publications")
    .select("snapshot, published_at")
    .eq("slug", slug)
    .eq("locale", locale)
    .maybeSingle();
  if (error) throw error;
  return publication ? publicationToPage(publication) : null;
}

/**
 * Published pages whose slug is nested under `prefix/` (not `prefix`
 * itself) — backs product_grid's "Services" tab, which links to the
 * real Fluid Levels/Pump Cards/Machine Shop CMS pages rather than the
 * (deliberately unused — see DECISIONS.md) `services` table.
 */
export async function listPagesUnderSlug(prefix: string, locale = "en"): Promise<Tables<"pages">[]> {
  const db = createServerDbClient();
  const { data, error } = await db
    .from("page_publications")
    .select("snapshot, published_at")
    .eq("locale", locale)
    .like("slug", `${prefix}/%`)
    .order("slug", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((publication) => publicationToPage(publication));
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
  const db = createServerDbClient();
  const { data: newId, error } = await db.rpc("duplicate_page_atomic", {
    p_page_id: id,
    p_new_slug: newSlug,
  });
  if (error) throw error;
  const page = await getPageById(newId);
  if (!page) throw new Error("Duplicated page could not be loaded");
  return page;
}

export async function deletePage(id: string): Promise<void> {
  const db = createServerDbClient();
  const { error } = await db.rpc("delete_page_atomic", { p_page_id: id });
  if (error) throw error;
}

/** Atomically replaces draft metadata + blocks with optimistic concurrency. */
export async function savePageDraft(
  id: string,
  meta: PageMeta,
  blocks: BlockInput[],
  expectedVersion: number,
): Promise<number> {
  const db = createServerDbClient();
  const { data, error } = await db.rpc("save_page_draft_atomic", {
    p_page_id: id,
    p_meta: meta as unknown as Json,
    p_blocks: blocks as unknown as Json,
    p_expected_version: expectedVersion,
  });
  if (error) throw error;
  return data;
}

export async function publishPage(id: string, expectedVersion: number): Promise<void> {
  const db = createServerDbClient();
  const { error } = await db.rpc("publish_page_atomic", {
    p_page_id: id,
    p_expected_version: expectedVersion,
  });
  if (error) throw error;
}

export async function unpublishPage(id: string): Promise<void> {
  const db = createServerDbClient();
  const { error } = await db.rpc("unpublish_page_atomic", { p_page_id: id });
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

export async function restorePageRevision(
  pageId: string,
  revisionId: string,
  expectedVersion: number,
): Promise<number> {
  const db = createServerDbClient();
  const { data: revision, error } = await db
    .from("page_revisions")
    .select("snapshot")
    .eq("id", revisionId)
    .eq("page_id", pageId)
    .single();
  if (error) throw error;

  const snapshot = revision.snapshot as { meta: PageMeta; blocks: Tables<"page_blocks">[] };
  return savePageDraft(
    pageId,
    snapshot.meta,
    snapshot.blocks.map((b) => ({ type: b.type, is_visible: b.is_visible, data: b.data as Record<string, unknown> })),
    expectedVersion,
  );
}

export async function recordAudit(
  action: string,
  entity: string,
  entityId?: string,
  diff?: Json,
): Promise<void> {
  const db = createServerDbClient();
  const { error } = await db.rpc("record_audit", {
    p_action: action,
    p_entity: entity,
    p_entity_id: entityId,
    p_diff: diff,
  });
  if (error) throw error;
}
