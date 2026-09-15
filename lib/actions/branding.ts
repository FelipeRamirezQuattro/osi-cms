"use server";

import { requireCapability } from "@/lib/auth";
import {
  getBrandingDraft,
  getBrandingDraftUnvalidated,
  getPublishedBranding,
  listBrandingRevisions,
  publishBranding,
  resetBrandingDraftToPublished,
  restoreBrandingRevisionToDraft,
  saveBrandingDraft,
  type BrandingDraft,
  type BrandingPublication,
  type BrandingRevision,
} from "@/lib/data/branding";
import { isVersionConflictError } from "@/lib/data/pages";
import { brandingConfigSchema } from "@/lib/branding/schema";
import type { z } from "zod";

/**
 * Server Actions for the branding module's data layer (Phase 1 — schema/
 * validation/permissions/audit only; the theme compiler and admin UI are
 * later phases, so nothing yet calls most of these). Every action here
 * requires the existing `manage_settings` capability (admin-only, see
 * lib/auth/capabilities.ts) per the Phase 1 brief — RLS
 * (0032_site_branding.sql) enforces the same rule independently at the
 * database layer, so a bug in one boundary doesn't silently open the
 * other.
 *
 * Same division of labor as lib/actions/pages.ts: this file validates
 * input with Zod and calls the lib/data/branding.ts repository, which
 * calls the security definer `*_atomic` SQL functions; those functions
 * call `record_audit` internally (0032_site_branding.sql), so no action
 * here calls it separately — matching how saveDraftAction/publishPageAction
 * never call recordAudit directly either.
 */

export type BrandingSaveResult =
  | { status: "success"; newVersion: number }
  | { status: "error"; message: string; field?: string; conflict?: boolean };

/** Prefers the SQL function's own user-facing message; falls back if the thrown value is shaped unexpectedly. */
function conflictResult(error: unknown, fallbackMessage: string): BrandingSaveResult {
  const message =
    isVersionConflictError(error) && typeof error.message === "string" && error.message.length > 0
      ? error.message
      : fallbackMessage;
  return { status: "error", message, conflict: true };
}

/** Shared by saveBrandingDraftAction and publishBrandingAction's pre-publish revalidation. */
function zodErrorResult(error: z.ZodError, fallbackMessage: string): BrandingSaveResult {
  const issue = error.issues[0];
  if (!issue) return { status: "error", message: fallbackMessage };
  const field = issue.path.length > 0 ? issue.path.join(".") : undefined;
  const message = field ? `${field}: ${issue.message}` : issue.message;
  return { status: "error", message, field };
}

export async function getBrandingDraftAction(): Promise<BrandingDraft> {
  await requireCapability("manage_settings");
  return getBrandingDraft();
}

export async function getPublishedBrandingAction(): Promise<BrandingPublication | null> {
  await requireCapability("manage_settings");
  return getPublishedBranding();
}

export async function listBrandingRevisionsAction(limit?: number): Promise<BrandingRevision[]> {
  await requireCapability("manage_settings");
  return listBrandingRevisions(limit);
}

/**
 * Validates the full branding configuration against `brandingConfigSchema`
 * before writing — the same "re-validate server-side before the DB ever
 * sees it" discipline saveDraftAction applies to page blocks. `rawConfig`
 * is `unknown` (not `BrandingConfig`) because it arrives from a client
 * form; the point of this function is to establish that trust boundary.
 */
export async function saveBrandingDraftAction(rawConfig: unknown, expectedVersion: number): Promise<BrandingSaveResult> {
  await requireCapability("manage_settings");

  const parsed = brandingConfigSchema.safeParse(rawConfig);
  if (!parsed.success) {
    return zodErrorResult(parsed.error, "Invalid branding configuration.");
  }

  try {
    const newVersion = await saveBrandingDraft(parsed.data, expectedVersion);
    return { status: "success", newVersion };
  } catch (error) {
    if (isVersionConflictError(error)) {
      return conflictResult(error, "Branding was changed by another administrator. Refresh before saving.");
    }
    return { status: "error", message: "Save failed. Please try again." };
  }
}

/**
 * Publishing re-validates the CURRENT draft row against the real schema
 * before ever calling publish_branding_atomic — the plan's own rule
 * ("Publishing validates the entire palette, surface presets, font keys,
 * role assignments, logo reference, and block-type defaults again on the
 * server"). This is NOT redundant with saveBrandingDraftAction's Zod
 * gate: the draft can become invalid without ever going through that
 * gate again — restoreBrandingRevisionToDraftAction copies an arbitrary
 * historical revision into the draft, and resetBrandingDraftToPublishedAction
 * copies the current publication, neither of which re-validates. A
 * revision written when a font catalog entry was still "available" (or
 * before a block type existed) is a concrete way an old, once-valid
 * snapshot can fail today's schema. Using `getBrandingDraftUnvalidated`
 * (not `getBrandingDraft`, which throws on an invalid row) plus
 * `safeParse` here means a bad draft is reported as a clean, actionable
 * error instead of an uncaught exception, and — critically — publish_
 * branding_atomic is never even called, so an invalid config can never
 * reach the public site.
 */
export async function publishBrandingAction(expectedVersion: number): Promise<BrandingSaveResult> {
  await requireCapability("manage_settings");

  try {
    const draftRow = await getBrandingDraftUnvalidated();
    const parsed = brandingConfigSchema.safeParse(draftRow.config);
    if (!parsed.success) {
      return zodErrorResult(
        parsed.error,
        "The current draft failed validation and cannot be published. Fix it (or use Reset to Published) before trying again.",
      );
    }

    await publishBranding(expectedVersion);
    // publish_branding_atomic doesn't bump draft_version (it only writes
    // the revision + publication rows) — the version the caller already
    // holds is still correct, threaded back through for a uniform
    // BrandingSaveResult the same way publishPageAction does.
    return { status: "success", newVersion: expectedVersion };
  } catch (error) {
    if (isVersionConflictError(error)) {
      return conflictResult(error, "Branding was changed by another administrator. Refresh before publishing.");
    }
    return { status: "error", message: "Publish failed. Please try again." };
  }
}

export async function restoreBrandingRevisionToDraftAction(
  revisionId: string,
  expectedVersion: number,
): Promise<BrandingSaveResult> {
  await requireCapability("manage_settings");
  try {
    const newVersion = await restoreBrandingRevisionToDraft(revisionId, expectedVersion);
    return { status: "success", newVersion };
  } catch (error) {
    if (isVersionConflictError(error)) {
      return conflictResult(error, "Branding was changed by another administrator. Refresh before restoring.");
    }
    return { status: "error", message: "Restore failed. Please try again." };
  }
}

export async function resetBrandingDraftToPublishedAction(expectedVersion: number): Promise<BrandingSaveResult> {
  await requireCapability("manage_settings");
  try {
    const newVersion = await resetBrandingDraftToPublished(expectedVersion);
    return { status: "success", newVersion };
  } catch (error) {
    if (isVersionConflictError(error)) {
      return conflictResult(error, "Branding was changed by another administrator. Refresh before resetting.");
    }
    return { status: "error", message: "Reset failed. Please try again." };
  }
}
