"use server";

import { requireCapability } from "@/lib/auth";
import {
  deleteMediaAssetProtected,
  findMediaAssetUsages,
  getMediaAssetById,
  listMediaAssets,
  listMediaFolders,
  listMediaTags,
  replaceMediaAsset,
  updateMediaAssetMetadata,
  uploadMediaAsset,
  MediaValidationError,
  type DeleteMediaResult,
  type ListMediaAssetsOptions,
  type ListMediaAssetsResult,
  type MediaAsset,
  type MediaUsage,
} from "@/lib/data/media";
import { mediaMetadataSchema, parseTagsInput, validateAltRequirement, type MediaKind } from "@/lib/validation/media";

export type { MediaAsset, MediaUsage };

export async function listMediaAction(options: ListMediaAssetsOptions = {}): Promise<ListMediaAssetsResult> {
  await requireCapability("upload_media");
  return listMediaAssets(options);
}

export async function listMediaFoldersAction(): Promise<string[]> {
  await requireCapability("upload_media");
  return listMediaFolders();
}

export async function listMediaTagsAction(): Promise<string[]> {
  await requireCapability("upload_media");
  return listMediaTags();
}

/** FormData.get() returns `null` for an absent field and `""` for a blank text input — both mean "not provided" here. */
function readFormMeta(formData: FormData) {
  const get = (key: string) => {
    const value = formData.get(key);
    return value === null || value === "" ? undefined : value;
  };
  return mediaMetadataSchema.safeParse({
    title: get("title"),
    alt: get("alt"),
    decorative: get("decorative"),
    caption: get("caption"),
    credit: get("credit"),
    folder: get("folder"),
    tags: get("tags"),
    width: get("width"),
    height: get("height"),
  });
}

export type UploadMediaState = { status: "idle" | "success" | "error"; message?: string; asset?: MediaAsset };

export async function uploadMediaAction(
  _prevState: UploadMediaState,
  formData: FormData,
): Promise<UploadMediaState> {
  await requireCapability("upload_media");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose a file first." };
  }

  const parsed = readFormMeta(formData);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    // MIME/extension/size and the alt-required-unless-decorative rule
    // are both re-checked inside uploadMediaAsset regardless of what
    // this action does — this call site only exists to turn that into a
    // friendly error before Storage/DB are ever touched.
    const asset = await uploadMediaAsset(file, {
      title: parsed.data.title,
      alt: parsed.data.alt,
      decorative: parsed.data.decorative,
      caption: parsed.data.caption,
      credit: parsed.data.credit,
      folder: parsed.data.folder,
      tags: parseTagsInput(parsed.data.tags),
      width: parsed.data.width,
      height: parsed.data.height,
    });
    return { status: "success", asset };
  } catch (err) {
    if (err instanceof MediaValidationError) {
      return { status: "error", message: err.message };
    }
    console.error("[media] Upload failed:", err);
    return { status: "error", message: err instanceof Error ? err.message : "Upload failed. Please try again." };
  }
}

export type UpdateMetadataState = { status: "idle" | "success" | "error"; message?: string; asset?: MediaAsset };

/**
 * Edits title/alt/decorative/caption/credit/folder/tags in place — the
 * acceptance criterion this satisfies directly: "alt/metadata changes do
 * not require re-uploading". Bound with `id` via a Server Action closure
 * (see components/admin/media/media-asset-card.tsx) so it fits
 * `useActionState`'s `(prevState, formData)` shape per asset.
 */
export async function updateMediaMetadataAction(
  id: string,
  _prevState: UpdateMetadataState,
  formData: FormData,
): Promise<UpdateMetadataState> {
  await requireCapability("upload_media");

  const existing = await getMediaAssetById(id);
  if (!existing) return { status: "error", message: "This media asset no longer exists." };

  const parsed = readFormMeta(formData);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const kind: MediaKind = existing.mime && !existing.mime.startsWith("image/") ? "document" : "image";
  const altError = validateAltRequirement(kind, parsed.data.alt ?? "", parsed.data.decorative ?? false);
  if (altError) {
    return { status: "error", message: altError };
  }

  try {
    const asset = await updateMediaAssetMetadata(id, {
      title: parsed.data.title?.trim() || null,
      alt: parsed.data.decorative ? null : (parsed.data.alt?.trim() || null),
      decorative: parsed.data.decorative ?? false,
      caption: parsed.data.caption?.trim() || null,
      credit: parsed.data.credit?.trim() || null,
      folder: parsed.data.folder?.trim() || null,
      tags: parseTagsInput(parsed.data.tags),
    });
    return { status: "success", asset };
  } catch (err) {
    console.error("[media] Metadata update failed:", err);
    return { status: "error", message: err instanceof Error ? err.message : "Could not save changes." };
  }
}

export async function getMediaUsagesAction(id: string): Promise<MediaUsage[]> {
  await requireCapability("delete_media");
  const asset = await getMediaAssetById(id);
  if (!asset) return [];
  return findMediaAssetUsages(asset.url);
}

export type DeleteMediaActionResult = DeleteMediaResult | { status: "error"; message: string };

/**
 * Never deletes an in-use asset (deleteMediaAssetProtected checks usages
 * first) — a "blocked" result carries the usage list so the UI can offer
 * the replace-everywhere flow instead of just failing.
 */
export async function deleteMediaActionFn(id: string): Promise<DeleteMediaActionResult> {
  await requireCapability("delete_media");
  try {
    return await deleteMediaAssetProtected(id);
  } catch (err) {
    console.error("[media] Delete failed:", err);
    return { status: "error", message: err instanceof Error ? err.message : "Delete failed." };
  }
}

export type ReplaceMediaActionResult = { status: "success"; updated: number } | { status: "error"; message: string };

/** Swaps every usage of `oldAssetId` to `newAssetId`, then marks the old asset replaced. Does not delete it — call deleteMediaActionFn afterward. */
export async function replaceMediaAssetAction(
  oldAssetId: string,
  newAssetId: string,
): Promise<ReplaceMediaActionResult> {
  await requireCapability("delete_media");
  try {
    const result = await replaceMediaAsset(oldAssetId, newAssetId);
    return { status: "success", updated: result.updated };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Replace failed." };
  }
}
