import { createHash } from "node:crypto";

/**
 * Where an imported Wix asset lives in the `media` Storage bucket. Deterministic (hash of the source URL),
 * so the asset-import script, the generated migration and a re-run all agree without a lookup table.
 */
export function legacyAssetPath(sourceUrl: string): string {
  const raw = decodeURIComponent(new URL(sourceUrl).pathname.split("/").pop() || "asset");
  const name = raw.replace(/~mv2/, "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "asset";
  return `legacy-pages/${createHash("sha1").update(sourceUrl).digest("hex").slice(0, 10)}-${name}`;
}

export function publicAssetUrl(supabaseUrl: string, sourceUrl: string): string {
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/media/${legacyAssetPath(sourceUrl)}`;
}
