"use server";

import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/auth";
import { getBlockPalette } from "@/lib/blocks/registry";
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
import { validateBlockList } from "@/lib/validation/blocks";
import { newPageSlugSchema, pageMetaSchema, type PageTemplate } from "@/lib/validation/pages";

/**
 * Task 7 item #8: `template` is a one-time creation preset, not a
 * runtime switch — this is the only place it has any effect. Each entry
 * is a block registry `type` (lib/blocks/registry.ts); an unknown type
 * (e.g. a block later removed from the registry) is silently skipped
 * rather than failing page creation.
 */
const STARTER_BLOCK_TYPES: Record<PageTemplate, string[]> = {
  standard: [],
  landing: ["hero_full", "cta_band"],
  legal: ["rich_text"],
  contact: ["contact_form"],
};

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

/**
 * Validates every block's data against its registered Zod schema before
 * writing — the shared implementation (lib/validation/blocks.ts) also
 * backs lib/actions/shared-sections.ts, since a shared section's blocks
 * go through the exact same registry-driven validation as a page's. Not
 * defined inline here as an exported function: a "use server" module may
 * only export async functions (every export becomes a Server Action
 * reference), and this is a plain synchronous helper.
 */
function validateBlocks(blocks: BlockInput[]): SaveResult | null {
  return validateBlockList(blocks);
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

    // Best-effort, in its own try/catch: the page row above already
    // exists at this point, so a failure seeding starter blocks (a
    // version conflict, an RLS hiccup, whatever) must never surface as
    // this function's page-*creation* error — the outer catch's
    // "slug already in use" message would be actively wrong (the page
    // was created fine; retrying would then hit a real unique-violation
    // on the slug that already exists) and would hide a page the editor
    // actually needs to go find under /admin/pages. Blocks can always be
    // added manually if this silently no-ops.
    const starterTypes = STARTER_BLOCK_TYPES[parsed.data.template] ?? [];
    if (starterTypes.length > 0) {
      try {
        const paletteByType = Object.fromEntries(getBlockPalette().map((entry) => [entry.type, entry]));
        const blocks: BlockInput[] = starterTypes
          .map((type) => paletteByType[type])
          .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
          .map((entry) => ({ type: entry.type, is_visible: true, data: entry.defaults as Record<string, unknown> }));
        if (blocks.length > 0) {
          await savePageDraft(page.id, parsed.data, blocks, page.draft_version);
        }
      } catch {
        // Page already exists; starter blocks just weren't seeded. Not
        // reported to the caller as an error — see comment above.
      }
    }

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
