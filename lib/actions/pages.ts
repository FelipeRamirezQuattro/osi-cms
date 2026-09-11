"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getBlockDefinition } from "@/lib/blocks/registry";
import {
  createPage,
  deletePage,
  duplicatePage,
  publishPage,
  restorePageRevision,
  savePageDraft,
  unpublishPage,
  type BlockInput,
  type PageMeta,
} from "@/lib/data/pages";

export type SaveResult = { status: "success" } | { status: "error"; message: string; blockIndex?: number };

/** Validates every block's data against its registered Zod schema before writing. */
function validateBlocks(blocks: BlockInput[]): SaveResult | null {
  for (let i = 0; i < blocks.length; i++) {
    const definition = getBlockDefinition(blocks[i].type);
    if (!definition) {
      return { status: "error", message: `Unknown block type "${blocks[i].type}"`, blockIndex: i };
    }
    const parsed = definition.schema.safeParse(blocks[i].data);
    if (!parsed.success) {
      return {
        status: "error",
        message: `${definition.label}: ${parsed.error.issues[0]?.message ?? "invalid data"}`,
        blockIndex: i,
      };
    }
  }
  return null;
}

export async function createPageAction(input: PageMeta): Promise<{ id: string } | { error: string }> {
  await requireAdmin();
  try {
    const page = await createPage(input);
    return { id: page.id };
  } catch {
    return { error: "Could not create the page — check the slug isn't already used." };
  }
}

export async function saveDraftAction(pageId: string, meta: PageMeta, blocks: BlockInput[]): Promise<SaveResult> {
  await requireAdmin();

  const validationError = validateBlocks(blocks);
  if (validationError) return validationError;

  try {
    await savePageDraft(pageId, meta, blocks);
    return { status: "success" };
  } catch {
    return { status: "error", message: "Save failed. Please try again." };
  }
}

export async function publishPageAction(pageId: string): Promise<SaveResult> {
  const session = await requireAdmin();
  try {
    await publishPage(pageId, session.userId);
    return { status: "success" };
  } catch {
    return { status: "error", message: "Publish failed. Please try again." };
  }
}

export async function unpublishPageAction(pageId: string): Promise<void> {
  await requireAdmin();
  await unpublishPage(pageId);
}

export async function deletePageAction(pageId: string): Promise<void> {
  await requireAdmin();
  await deletePage(pageId);
  redirect("/admin/pages");
}

export async function duplicatePageAction(pageId: string, newSlug: string): Promise<{ id: string } | { error: string }> {
  await requireAdmin();
  try {
    const page = await duplicatePage(pageId, newSlug);
    return { id: page.id };
  } catch {
    return { error: "Could not duplicate — check the new slug isn't already used." };
  }
}

export async function restoreRevisionAction(pageId: string, revisionId: string): Promise<void> {
  await requireAdmin();
  await restorePageRevision(pageId, revisionId);
}
