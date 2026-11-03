/**
 * Copies the two certification badges of the Wix footer into the media library (QA entregables 5/6, P4).
 * Wix serves both as crops of one image (Cert-45-9.jpg); content/legacy/footer holds the two crops.
 *
 * Run it BEFORE applying migration 0060 (which links these URLs from site_settings.footer_badges).
 * Idempotent: an object/row that already exists is left alone. Touches no site content.
 *
 * Usage: pnpm import:footer-assets [--dry-run]
 */
import fs from "node:fs";
import path from "node:path";
import { createServiceRoleDbClient } from "../lib/db/client";

const DRY_RUN = process.argv.includes("--dry-run");
const DIR = path.join(import.meta.dirname, "..", "content", "legacy", "footer");
const BADGES = [
  { file: "iso-9001-scb.jpg", alt: "ISO 9001 quality management certification, certified by SCB" },
  { file: "iso-45001-sgs.jpg", alt: "ISO 45001 occupational health and safety certification by SGS" },
];

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  const db = createServiceRoleDbClient();
  for (const badge of BADGES) {
    const storagePath = `legacy-footer/${badge.file}`;
    const publicUrl = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/media/${storagePath}`;
    const { data: existing } = await db.from("media_assets").select("id").eq("url", publicUrl).maybeSingle();
    if (existing) {
      console.log(`= ${storagePath} (already registered)`);
      continue;
    }
    if (DRY_RUN) {
      console.log(`+ ${storagePath}`);
      continue;
    }
    const body = fs.readFileSync(path.join(DIR, badge.file));
    const { error: upErr } = await db.storage.from("media").upload(storagePath, body, { contentType: "image/jpeg", upsert: true });
    if (upErr) throw upErr;
    const { error: rowErr } = await db.from("media_assets").insert({
      url: publicUrl,
      alt: badge.alt,
      decorative: false,
      mime: "image/jpeg",
      title: badge.file,
      filename: badge.file,
      file_size: body.length,
      folder: "Legacy pages",
      source: "uploaded",
    });
    if (rowErr) throw rowErr;
    console.log(`+ ${storagePath} (${(body.length / 1024).toFixed(0)} KB)`);
  }
  console.log("Done.");
}

void main().catch((e) => {
  console.error(e instanceof Error ? e.message : JSON.stringify(e));
  process.exit(1);
});
