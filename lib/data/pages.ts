import { createServerDbClient } from "@/lib/db/client";
import type { Json, Tables } from "@/lib/db/database.types";

export type PageWithBlocks = Tables<"pages"> & {
  blocks: Tables<"page_blocks">[];
  /**
   * The slug this page is currently *published* under (page_publications.
   * slug), as distinct from `slug` above (the draft's current value,
   * which may already differ if the editor changed it without publishing
   * yet). `null` if the page has never been published. Task 15's slug-
   * change redirect warning (page-editor.tsx's onPublish) compares the
   * form's slug against this, not against `page.slug`, since that's
   * always the pre-edit draft value and would never show a change.
   */
  publishedSlug?: string | null;
};

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
    publishedSlug: snapshot.meta.slug,
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

  const [{ data: blocks, error: blocksError }, { data: publication, error: publicationError }] = await Promise.all([
    db.from("page_blocks").select("*").eq("page_id", page.id).order("position", { ascending: true }),
    db.from("page_publications").select("slug").eq("page_id", page.id).maybeSingle(),
  ]);
  if (blocksError) throw blocksError;
  if (publicationError) throw publicationError;

  return { ...page, blocks: blocks ?? [], publishedSlug: publication?.slug ?? null };
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

export async function publishPage(
  id: string,
  expectedVersion: number,
  options?: { createRedirect?: boolean; redirectStatusCode?: number },
): Promise<void> {
  const db = createServerDbClient();
  const { error } = await db.rpc("publish_page_atomic", {
    p_page_id: id,
    p_expected_version: expectedVersion,
    p_create_redirect: options?.createRedirect ?? false,
    p_redirect_status_code: options?.redirectStatusCode ?? 301,
  });
  if (error) throw error;
}

export async function unpublishPage(id: string): Promise<void> {
  const db = createServerDbClient();
  const { error } = await db.rpc("unpublish_page_atomic", { p_page_id: id });
  if (error) throw error;
}

/**
 * Archive/restore (Task 15) — see supabase/migrations/
 * 0029_archived_status.sql's archive_page_atomic/restore_page_atomic for
 * why these go through SECURITY DEFINER RPCs rather than a plain
 * `.update()` the way products/news/resources archive does: `pages`'
 * UPDATE RLS policy is admin-only (migration 0017), so an editor
 * archiving a draft page needs the same has_capability()-checked-inside-
 * the-function pattern publish/unpublish already use.
 */
export async function archivePage(id: string): Promise<void> {
  const db = createServerDbClient();
  const { error } = await db.rpc("archive_page_atomic", { p_page_id: id });
  if (error) throw error;
}

export async function restorePage(id: string): Promise<void> {
  const db = createServerDbClient();
  const { error } = await db.rpc("restore_page_atomic", { p_page_id: id });
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

/**
 * save_page_draft_atomic/publish_page_atomic (and restorePageRevision,
 * which calls the former) raise with errcode 40001 on an optimistic-
 * concurrency mismatch — see supabase/migrations/
 * 0017_publishing_permissions_atomic.sql. Every `.rpc()` call above does
 * a plain `if (error) throw error;`, so the thrown value is the
 * PostgrestError object as-is, whose `.code` carries the raw Postgres
 * SQLSTATE verbatim (no HTTP-status translation for RPC calls). Lives
 * here rather than in lib/actions/pages.ts because a "use server" module
 * may only export async functions (Next.js requirement — every export
 * from such a file is treated as a Server Action reference).
 */
export function isVersionConflictError(error: unknown): error is { code: string; message?: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "40001"
  );
}
