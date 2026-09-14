"use server";

import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/auth";
import { getBlockDefinition } from "@/lib/blocks/registry";
import {
  createPage,
  deletePage,
  duplicatePage,
  isVersionConflictError,
  publishPage,
  restorePageRevision,
  savePageDraft,
  unpublishPage,
  type BlockInput,
  type PageMeta,
} from "@/lib/data/pages";
import { formatZodError, isUniqueViolationError } from "@/lib/validation/common";
import { newPageSlugSchema, pageMetaSchema } from "@/lib/validation/pages";

export type SaveResult =
  | { status: "success"; newVersion: number }
  | { status: "error"; message: string; blockIndex?: number; field?: string; conflict?: boolean };

/** Prefers the SQL function's own user-facing message; falls back if the thrown value is shaped unexpectedly. */
function conflictResult(error: unknown, fallbackMessage: string): SaveResult {
  const message =
    isVersionConflictError(error) && typeof error.message === "string" && error.message.length > 0
      ? error.message
      : fallbackMessage;
  return { status: "error", message, conflict: true };
}

/** Validates every block's data against its registered Zod schema before writing. */
function validateBlocks(blocks: BlockInput[]): SaveResult | null {
  for (let i = 0; i < blocks.length; i++) {
    const definition = getBlockDefinition(blocks[i].type);
    if (!definition) {
      return { status: "error", message: `Unknown block type "${blocks[i].type}"`, blockIndex: i };
    }
    const parsed = definition.schema.safeParse(blocks[i].data);
    if (!parsed.success) {
      const { message, field } = formatZodError(parsed.error);
      return {
        status: "error",
        message: `Block ${i + 1} (${definition.label}): ${message}`,
        blockIndex: i,
        field,
      };
    }
  }
  return null;
}

export async function createPageAction(input: PageMeta): Promise<{ id: string } | { error: string; field?: string }> {
  await requireCapability("edit_drafts");

  const parsed = pageMetaSchema.safeParse(input);
  if (!parsed.success) {
    const { message, field } = formatZodError(parsed.error);
    return { error: message, field };
  }

  try {
    const page = await createPage(parsed.data);
    return { id: page.id };
  } catch (error) {
    if (isUniqueViolationError(error)) {
      return { error: "That slug is already in use — choose a different one.", field: "slug" };
    }
    return { error: "Could not create the page — check the slug isn't already used." };
  }
}

export async function saveDraftAction(
  pageId: string,
  meta: PageMeta,
  blocks: BlockInput[],
  expectedVersion: number,
): Promise<SaveResult> {
  await requireCapability("edit_drafts");

  const parsedMeta = pageMetaSchema.safeParse(meta);
  if (!parsedMeta.success) {
    const { message, field } = formatZodError(parsedMeta.error);
    return { status: "error", message, field };
  }

  const validationError = validateBlocks(blocks);
  if (validationError) return validationError;

  try {
    const newVersion = await savePageDraft(pageId, parsedMeta.data, blocks, expectedVersion);
    return { status: "success", newVersion };
  } catch (error) {
    if (isVersionConflictError(error)) {
      return conflictResult(error, "This page was changed by another editor. Refresh before saving.");
    }
    if (isUniqueViolationError(error)) {
      return { status: "error", message: "That slug is already in use by another page.", field: "slug" };
    }
    return { status: "error", message: "Save failed. Please try again." };
  }
}

export async function publishPageAction(pageId: string, expectedVersion: number): Promise<SaveResult> {
  await requireCapability("publish");
  try {
    await publishPage(pageId, expectedVersion);
    // publish_page_atomic doesn't bump draft_version (it only flips
    // status/published_at) — the version the editor already holds is
    // still correct, so it's threaded back through unchanged for a
    // uniform SaveResult the editor can handle the same way as save/restore.
    return { status: "success", newVersion: expectedVersion };
  } catch (error) {
    if (isVersionConflictError(error)) {
      return conflictResult(error, "This page was changed by another editor. Refresh before publishing.");
    }
    return { status: "error", message: "Publish failed. Please try again." };
  }
}

export async function unpublishPageAction(pageId: string): Promise<void> {
  await requireCapability("publish");
  await unpublishPage(pageId);
}

export async function deletePageAction(pageId: string): Promise<void> {
  await requireCapability("delete_content");
  await deletePage(pageId);
  redirect("/admin/pages");
}

export async function duplicatePageAction(
  pageId: string,
  newSlug: string,
): Promise<{ id: string } | { error: string; field?: string }> {
  await requireCapability("edit_drafts");

  const parsed = newPageSlugSchema.safeParse(newSlug);
  if (!parsed.success) {
    return { error: formatZodError(parsed.error).message, field: "slug" };
  }

  try {
    const page = await duplicatePage(pageId, parsed.data);
    return { id: page.id };
  } catch (error) {
    if (isUniqueViolationError(error)) {
      return { error: "That slug is already in use — choose a different one.", field: "slug" };
    }
    return { error: "Could not duplicate — check the new slug isn't already used." };
  }
}

export async function restoreRevisionAction(
  pageId: string,
  revisionId: string,
  expectedVersion: number,
): Promise<SaveResult> {
  await requireCapability("edit_drafts");
  try {
    const newVersion = await restorePageRevision(pageId, revisionId, expectedVersion);
    return { status: "success", newVersion };
  } catch (error) {
    if (isVersionConflictError(error)) {
      return conflictResult(error, "This page was changed by another editor. Refresh before restoring.");
    }
    return { status: "error", message: "Restore failed. Please try again." };
  }
}
