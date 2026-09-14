"use server";

import { requireCapability } from "@/lib/auth";
import { listMediaAssets, uploadMediaAsset, deleteMediaAsset, type MediaAsset } from "@/lib/data/media";
import { mediaUploadSchema } from "@/lib/validation/media";

export async function listMediaAction(search?: string): Promise<MediaAsset[]> {
  await requireCapability("upload_media");
  return listMediaAssets(search);
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

  // WCAG 2.1 AA (master prompt §9 Phase 7: "alt text enforced in admin")
  // — this is the one chokepoint every image passes through, so it's
  // enforced here server-side, not just via the form's `required`
  // attribute (which a direct POST could bypass).
  const parsed = mediaUploadSchema.safeParse({ alt: formData.get("alt") });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Alt text is required." };
  }

  try {
    const asset = await uploadMediaAsset(file, parsed.data.alt);
    return { status: "success", asset };
  } catch {
    return { status: "error", message: "Upload failed. Please try again." };
  }
}

export async function deleteMediaActionFn(id: string): Promise<void> {
  await requireCapability("delete_media");
  await deleteMediaAsset(id);
}
