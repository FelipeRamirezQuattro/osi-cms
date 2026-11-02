/**
 * Copies every image and document the 12 re-imported Wix pages use into the media library (QA entregables 5/6):
 * downloads it from Wix, uploads it to the `media` Storage bucket under a deterministic path
 * (lib/legacy/asset-path.ts) and registers it in `media_assets` with the Wix alt text.
 *
 * Run it BEFORE applying the page migration: the migration refuses to run if any of these rows is missing.
 * Idempotent: an object/row that already exists is left alone. Touches no page content.
 *
 * Usage: pnpm import:page-assets [--dry-run]
 *   (= tsx --env-file=.env.local scripts/import-page-assets.ts)
 */
import path from "node:path";
import { createServiceRoleDbClient } from "../lib/db/client";
import { legacyAssetPath, publicAssetUrl } from "../lib/legacy/asset-path";
import { planAll } from "./plan-wix-pages";

const DRY_RUN = process.argv.includes("--dry-run");
const MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", svg: "image/svg+xml", pdf: "application/pdf" };
const MAX_BYTES = 20 * 1024 * 1024;

export function collectAssets() {
  const byUrl = new Map<string, { kind: "image" | "file"; url: string; alt?: string; pages: string[] }>();
  for (const { spec, mapped } of planAll()) {
    for (const a of mapped.assets) {
      const cur = byUrl.get(a.url);
      if (cur) {
        cur.pages.push(spec.slug);
        cur.alt ??= a.alt;
      } else byUrl.set(a.url, { kind: a.kind, url: a.url, alt: a.alt, pages: [spec.slug] });
    }
  }
  return [...byUrl.values()];
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  const db = createServiceRoleDbClient();
  const assets = collectAssets();
  console.log(`${assets.length} assets (${assets.filter((a) => a.kind === "image").length} images, ${assets.filter((a) => a.kind === "file").length} files)${DRY_RUN ? " — dry run" : ""}`);
  let failed = 0;
  for (const a of assets) {
    const storagePath = legacyAssetPath(a.url);
    const publicUrl = publicAssetUrl(supabaseUrl, a.url);
    const ext = path.extname(storagePath).slice(1).toLowerCase();
    try {
      const { data: existing } = await db.from("media_assets").select("id").eq("url", publicUrl).maybeSingle();
      if (existing) {
        console.log(`= ${storagePath} (already registered)`);
        continue;
      }
      if (DRY_RUN) {
        console.log(`+ ${storagePath}  <-  ${a.url}`);
        continue;
      }
      const res = await fetch(a.url);
      if (!res.ok) throw new Error(`download ${res.status}`);
      const body = Buffer.from(await res.arrayBuffer());
      if (body.length > MAX_BYTES) throw new Error(`too large (${body.length} bytes)`);
      const mime = MIME[ext] ?? res.headers.get("content-type") ?? "application/octet-stream";
      const { error: upErr } = await db.storage.from("media").upload(storagePath, body, { contentType: mime, upsert: true });
      if (upErr) throw upErr;
      const filename = path.basename(storagePath);
      const { error: rowErr } = await db.from("media_assets").insert({
        url: publicUrl,
        alt: a.kind === "image" ? (a.alt?.trim() || null) : null,
        decorative: false,
        mime,
        title: filename,
        filename,
        file_size: body.length,
        folder: "Legacy pages",
        source: "uploaded",
      });
      if (rowErr) throw rowErr;
      console.log(`+ ${storagePath} (${(body.length / 1024).toFixed(0)} KB)`);
    } catch (e) {
      failed++;
      console.error(`! ${a.url}: ${e instanceof Error ? e.message : JSON.stringify(e)}`);
    }
  }
  console.log(failed ? `\n${failed} failed — fix and re-run (it skips what is already done).` : "\nDone.");
  process.exit(failed ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) void main();
