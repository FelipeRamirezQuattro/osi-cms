import { createServerDbClient } from "@/lib/db/client";
import { recordAudit } from "@/lib/data/audit";
import type { Tables } from "@/lib/db/database.types";

export type MediaAsset = Tables<"media_assets">;

const BUCKET = "media";

export async function listMediaAssets(search?: string, limit = 60): Promise<MediaAsset[]> {
  const db = createServerDbClient();
  let query = db.from("media_assets").select("*").order("created_at", { ascending: false }).limit(limit);
  if (search) {
    query = query.or(`title.ilike.%${search}%,alt.ilike.%${search}%,url.ilike.%${search}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function uploadMediaAsset(file: File, alt?: string): Promise<MediaAsset> {
  const db = createServerDbClient();

  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
  const path = `${crypto.randomUUID()}${ext}`;

  const { error: uploadError } = await db.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = db.storage.from(BUCKET).getPublicUrl(path);

  const { data, error } = await db
    .from("media_assets")
    .insert({
      url: publicUrl,
      alt: alt || null,
      mime: file.type || null,
      title: file.name,
      source: "uploaded",
    })
    .select("*")
    .single();
  if (error) throw error;
  // Filename/mime/alt only — never the file's bytes, which is the only
  // thing in this upload that could conceivably be sensitive.
  await recordAudit("upload", "media_asset", data.id, { title: data.title, mime: data.mime });
  return data;
}

export async function deleteMediaAsset(id: string): Promise<void> {
  const db = createServerDbClient();
  const { data: asset, error: fetchError } = await db
    .from("media_assets")
    .select("url, source")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!asset) return;

  if (asset.source === "uploaded") {
    const path = asset.url.split(`/${BUCKET}/`).pop();
    if (path) await db.storage.from(BUCKET).remove([path]);
  }

  const { error } = await db.from("media_assets").delete().eq("id", id);
  if (error) throw error;
  await recordAudit("delete", "media_asset", id, { url: asset.url });
}
