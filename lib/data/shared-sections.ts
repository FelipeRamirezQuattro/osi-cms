import { createServerDbClient } from "@/lib/db/client";
import type { Json, Tables } from "@/lib/db/database.types";

export type SharedSectionWithBlocks = Tables<"shared_sections"> & { blocks: Tables<"shared_section_blocks">[] };

type PublishedSnapshot = {
  title: string;
  blocks: Tables<"shared_section_blocks">[];
};

export type PublishedSharedSection = {
  key: string;
  title: string;
  blocks: Tables<"shared_section_blocks">[];
};

function publicationToSection(
  publication: Pick<Tables<"shared_section_publications">, "key" | "snapshot">,
): PublishedSharedSection {
  const snapshot = publication.snapshot as unknown as PublishedSnapshot;
  return {
    key: publication.key,
    title: snapshot.title,
    blocks: snapshot.blocks.filter((block) => block.is_visible).sort((a, b) => a.position - b.position),
  };
}

/**
 * Public read path for the `shared_section` reference block
 * (components/blocks/shared-section.tsx) — reads the publication snapshot
 * only, never the draft tables, same isolation guarantee as
 * getPageBySlug() in lib/data/pages.ts (see that file's regression test
 * for why this distinction matters).
 */
export async function getPublishedSharedSectionByKey(key: string): Promise<PublishedSharedSection | null> {
  const db = createServerDbClient();
  const { data: publication, error } = await db
    .from("shared_section_publications")
    .select("key, snapshot")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return publication ? publicationToSection(publication) : null;
}

// --- Admin (relies on RLS: an authenticated staff session sees every
// draft row, per shared_sections'/shared_section_blocks' policies). ---

export async function listAllSharedSections(): Promise<Tables<"shared_sections">[]> {
  const db = createServerDbClient();
  const { data, error } = await db
    .from("shared_sections")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getSharedSectionById(id: string): Promise<SharedSectionWithBlocks | null> {
  const db = createServerDbClient();
  const { data: section, error } = await db.from("shared_sections").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!section) return null;

  const { data: blocks, error: blocksError } = await db
    .from("shared_section_blocks")
    .select("*")
    .eq("section_id", section.id)
    .order("position", { ascending: true });
  if (blocksError) throw blocksError;

  return { ...section, blocks: blocks ?? [] };
}

export type CreateSharedSectionInput = { key: string; title: string };
export type SharedSectionBlockInput = { type: string; is_visible: boolean; data: Record<string, unknown> };

export async function createSharedSection(input: CreateSharedSectionInput): Promise<Tables<"shared_sections">> {
  const db = createServerDbClient();
  const { data, error } = await db.from("shared_sections").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

/** Atomically replaces draft title + blocks with optimistic concurrency. */
export async function saveSharedSectionDraft(
  id: string,
  title: string,
  blocks: SharedSectionBlockInput[],
  expectedVersion: number,
): Promise<number> {
  const db = createServerDbClient();
  const { data, error } = await db.rpc("save_shared_section_draft_atomic", {
    p_section_id: id,
    p_title: title,
    p_blocks: blocks as unknown as Json,
    p_expected_version: expectedVersion,
  });
  if (error) throw error;
  return data;
}

export async function publishSharedSection(id: string, expectedVersion: number): Promise<void> {
  const db = createServerDbClient();
  const { error } = await db.rpc("publish_shared_section_atomic", {
    p_section_id: id,
    p_expected_version: expectedVersion,
  });
  if (error) throw error;
}

export async function unpublishSharedSection(id: string): Promise<void> {
  const db = createServerDbClient();
  const { error } = await db.rpc("unpublish_shared_section_atomic", { p_section_id: id });
  if (error) throw error;
}

export async function deleteSharedSection(id: string): Promise<void> {
  const db = createServerDbClient();
  const { error } = await db.rpc("delete_shared_section_atomic", { p_section_id: id });
  if (error) throw error;
}
