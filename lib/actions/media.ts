"use server";

import { requireAdmin } from "@/lib/auth";
import { listMediaAssets, uploadMediaAsset, deleteMediaAsset, type MediaAsset } from "@/lib/data/media";

export async function listMediaAction(search?: string): Promise<MediaAsset[]> {
  await requireAdmin();
  return listMediaAssets(search);
}

export type UploadMediaState = { status: "idle" | "success" | "error"; message?: string; asset?: MediaAsset };

export async function uploadMediaAction(
  _prevState: UploadMediaState,
  formData: FormData,
): Promise<UploadMediaState> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose a file first." };
  }

  try {
    const asset = await uploadMediaAsset(file, (formData.get("alt") as string) || undefined);
    return { status: "success", asset };
  } catch {
    return { status: "error", message: "Upload failed. Please try again." };
  }
}

export async function deleteMediaActionFn(id: string): Promise<void> {
  await requireAdmin();
  await deleteMediaAsset(id);
}
