import { createServerDbClient } from "@/lib/db/client";
import type { Json, Tables } from "@/lib/db/database.types";
import type { BrandingConfig } from "@/lib/branding/schema";
import { parseBrandingConfig } from "@/lib/branding/schema";

/**
 * Repository for the branding module's three tables (supabase/migrations/
 * 0032_site_branding.sql) — all DB access lives here per CLAUDE.md
 * constraint 2; every caller (Server Actions today, a future theme
 * compiler/admin UI later) goes through these functions, never a direct
 * `@supabase/*` import.
 *
 * Every `config` column read here is run through `parseBrandingConfig`
 * (lib/branding/schema.ts) before being handed back — never cast the raw
 * jsonb directly to `BrandingConfig` (the plan's "Configuration schema
 * versioning" rule). This mirrors lib/data/pages.ts's PublishedSnapshot
 * cast pattern in spirit, but branding's config is validated, not just
 * type-asserted, since a malformed row here would otherwise be trusted
 * silently by every downstream reader.
 */

export type BrandingDraft = Omit<Tables<"site_branding">, "config"> & { config: BrandingConfig };
export type BrandingPublication = Omit<Tables<"site_branding_publications">, "config"> & { config: BrandingConfig };
export type BrandingRevision = Omit<Tables<"site_branding_revisions">, "config"> & { config: BrandingConfig };

function toBrandingDraft(row: Tables<"site_branding">): BrandingDraft {
  return { ...row, config: parseBrandingConfig(row.config) };
}

function toBrandingPublication(row: Tables<"site_branding_publications">): BrandingPublication {
  return { ...row, config: parseBrandingConfig(row.config) };
}

function toBrandingRevision(row: Tables<"site_branding_revisions">): BrandingRevision {
  return { ...row, config: parseBrandingConfig(row.config) };
}

/**
 * The admin-only draft row. Callers must already be capability-gated
 * (requireCapability("manage_settings") — see lib/actions/branding.ts)
 * before calling this; RLS enforces the same rule independently
 * (site_branding's "admins can manage site branding draft" policy).
 */
export async function getBrandingDraft(): Promise<BrandingDraft> {
  const db = createServerDbClient();
  const { data, error } = await db.from("site_branding").select("*").eq("id", true).single();
  if (error) throw error;
  return toBrandingDraft(data);
}

/**
 * Same read as getBrandingDraft, but returns the row's `config` UNPARSED
 * (`Json`, not `BrandingConfig`) — exists specifically for
 * publishBrandingAction (lib/actions/branding.ts), which must re-validate
 * the draft with a non-throwing `safeParse` immediately before publishing
 * it (the plan's "Publishing validates the entire palette ... again on
 * the server" rule) and needs to turn a validation failure into a clean
 * error result, not an uncaught exception. `getBrandingDraft` above
 * intentionally still throws on an invalid row (see its own test in
 * branding.test.ts) — that's the right behavior for an ordinary "load the
 * draft to display/edit it" read, just not for this one call site that
 * needs to inspect a *possibly-invalid* draft without blowing up.
 */
export async function getBrandingDraftUnvalidated(): Promise<Tables<"site_branding">> {
  const db = createServerDbClient();
  const { data, error } = await db.from("site_branding").select("*").eq("id", true).single();
  if (error) throw error;
  return data;
}

/**
 * The public-readable published snapshot — the only branding table a
 * future public theme compiler is allowed to query (site_branding_
 * publications' RLS grants SELECT to `true`, unlike the other two
 * tables). Returns `null` only in the pathological case where the
 * singleton row doesn't exist yet (it's seeded by 0032_site_branding.sql,
 * so this should never actually happen against a migrated database).
 */
export async function getPublishedBranding(): Promise<BrandingPublication | null> {
  const db = createServerDbClient();
  const { data, error } = await db.from("site_branding_publications").select("*").eq("id", true).maybeSingle();
  if (error) throw error;
  return data ? toBrandingPublication(data) : null;
}

/**
 * Saves a validated branding config as the new draft. `config` must
 * already be Zod-validated by the caller (lib/actions/branding.ts) —
 * this function only performs the atomic optimistic-concurrency write
 * (save_branding_draft_atomic, 0032_site_branding.sql), matching how
 * savePageDraft (lib/data/pages.ts) relates to save_page_draft_atomic.
 * Throws with `.code === "40001"` (see isVersionConflictError in
 * lib/data/pages.ts) if `expectedVersion` is stale.
 */
export async function saveBrandingDraft(config: BrandingConfig, expectedVersion: number): Promise<number> {
  const db = createServerDbClient();
  const { data, error } = await db.rpc("save_branding_draft_atomic", {
    p_config: config as unknown as Json,
    p_expected_version: expectedVersion,
  });
  if (error) throw error;
  return data;
}

/**
 * Publishes the current draft: snapshots it into site_branding_revisions
 * and atomically swaps site_branding_publications (publish_branding_
 * atomic, 0032_site_branding.sql). A failed publish (including a stale
 * `expectedVersion`) leaves the current publication and revision history
 * completely unchanged — the whole operation is one Postgres function
 * body, so this is transactional for free, no hand-rolled rollback.
 */
export async function publishBranding(expectedVersion: number): Promise<void> {
  const db = createServerDbClient();
  const { error } = await db.rpc("publish_branding_atomic", { p_expected_version: expectedVersion });
  if (error) throw error;
}

/** Newest-first publish history — admin-only (site_branding_revisions has no public SELECT policy). */
export async function listBrandingRevisions(limit = 20): Promise<BrandingRevision[]> {
  const db = createServerDbClient();
  const { data, error } = await db
    .from("site_branding_revisions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(toBrandingRevision);
}

/**
 * Overwrites the draft with a past revision's config (restore_branding_
 * revision_to_draft_atomic) — does NOT publish it; an admin must still
 * review and explicitly publish afterward, same two-step restore flow
 * pages.ts's restorePageRevision follows.
 */
export async function restoreBrandingRevisionToDraft(revisionId: string, expectedVersion: number): Promise<number> {
  const db = createServerDbClient();
  const { data, error } = await db.rpc("restore_branding_revision_to_draft_atomic", {
    p_revision_id: revisionId,
    p_expected_version: expectedVersion,
  });
  if (error) throw error;
  return data;
}

/**
 * Discards unsaved/unpublished draft changes by overwriting the draft
 * with the currently published config (reset_branding_draft_to_published_
 * atomic) — the "Use block default"-style escape hatch at the site-wide
 * level: "I don't like what I've been editing, go back to what's live."
 */
export async function resetBrandingDraftToPublished(expectedVersion: number): Promise<number> {
  const db = createServerDbClient();
  const { data, error } = await db.rpc("reset_branding_draft_to_published_atomic", {
    p_expected_version: expectedVersion,
  });
  if (error) throw error;
  return data;
}
