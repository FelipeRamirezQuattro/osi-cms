"use server";

import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/auth";
import {
  createSharedSection,
  deleteSharedSection,
  publishSharedSection,
  saveSharedSectionDraft,
  unpublishSharedSection,
  type SharedSectionBlockInput,
} from "@/lib/data/shared-sections";
import { isVersionConflictError } from "@/lib/data/pages";
import { formatZodError, isUniqueViolationError } from "@/lib/validation/common";
import { validateBlockList } from "@/lib/validation/blocks";
import { validateBlockAppearanceReferences } from "@/lib/validation/block-appearance";
import { getPublishedBranding } from "@/lib/data/branding";
import { OSI_SEED_BRANDING_CONFIG } from "@/lib/branding/seed";
import { createSharedSectionSchema, sharedSectionTitleSchema } from "@/lib/validation/shared-sections";

export type SharedSectionSaveResult =
  | { status: "success"; newVersion: number }
  | { status: "error"; message: string; blockIndex?: number; field?: string; conflict?: boolean };

/** Prefers the SQL function's own user-facing message; falls back if the thrown value is shaped unexpectedly. */
function conflictResult(error: unknown, fallbackMessage: string): SharedSectionSaveResult {
  const message =
    isVersionConflictError(error) && typeof error.message === "string" && error.message.length > 0
      ? error.message
      : fallbackMessage;
  return { status: "error", message, conflict: true };
}

export async function createSharedSectionAction(
  input: unknown,
): Promise<{ id: string } | { error: string; field?: string }> {
  await requireCapability("edit_drafts");

  const parsed = createSharedSectionSchema.safeParse(input);
  if (!parsed.success) {
    const { message, field } = formatZodError(parsed.error);
    return { error: message, field };
  }

  try {
    const section = await createSharedSection(parsed.data);
    return { id: section.id };
  } catch (error) {
    if (isUniqueViolationError(error)) {
      return { error: "That key is already in use — choose a different one.", field: "key" };
    }
    return { error: "Could not create the shared section — check the key isn't already used." };
  }
}

export async function saveSharedSectionDraftAction(
  sectionId: string,
  title: string,
  blocks: SharedSectionBlockInput[],
  expectedVersion: number,
): Promise<SharedSectionSaveResult> {
  await requireCapability("edit_drafts");

  const parsedTitle = sharedSectionTitleSchema.safeParse(title);
  if (!parsedTitle.success) {
    const { message, field } = formatZodError(parsedTitle.error);
    return { status: "error", message, field };
  }

  const validationError = validateBlockList(blocks);
  if (validationError) return validationError;
  let publishedBrandingConfig = OSI_SEED_BRANDING_CONFIG;
  try {
    const publishedBranding = await getPublishedBranding();
    if (publishedBranding) publishedBrandingConfig = publishedBranding.config;
  } catch {
    // Malformed/unreachable publication row — fail open to the built-in
    // OSI defaults rather than blocking every save (matches
    // resolvePublishedBranding's fallback behavior for public routes).
  }
  const appearanceError = validateBlockAppearanceReferences(blocks, publishedBrandingConfig);
  if (appearanceError) return appearanceError;

  try {
    const newVersion = await saveSharedSectionDraft(sectionId, parsedTitle.data, blocks, expectedVersion);
    return { status: "success", newVersion };
  } catch (error) {
    if (isVersionConflictError(error)) {
      return conflictResult(error, "This shared section was changed by another editor. Refresh before saving.");
    }
    return { status: "error", message: "Save failed. Please try again." };
  }
}

export async function publishSharedSectionAction(
  sectionId: string,
  expectedVersion: number,
): Promise<SharedSectionSaveResult> {
  await requireCapability("publish");
  try {
    await publishSharedSection(sectionId, expectedVersion);
    // publish_shared_section_atomic doesn't bump draft_version (matches
    // publish_page_atomic) — the version the editor already holds is
    // still correct.
    return { status: "success", newVersion: expectedVersion };
  } catch (error) {
    if (isVersionConflictError(error)) {
      return conflictResult(error, "This shared section was changed by another editor. Refresh before publishing.");
    }
    return { status: "error", message: "Publish failed. Please try again." };
  }
}

export async function unpublishSharedSectionAction(sectionId: string): Promise<void> {
  await requireCapability("publish");
  await unpublishSharedSection(sectionId);
}

export async function deleteSharedSectionAction(sectionId: string): Promise<void> {
  await requireCapability("delete_content");
  await deleteSharedSection(sectionId);
  redirect("/admin/shared-sections");
}
