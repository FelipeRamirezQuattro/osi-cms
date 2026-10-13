/**
 * Adds the images the batch-1 text-only migration left out (QA, Oct 13:
 * Machine Shop, Services, Hiring, HSE, Careers) to those pages' DRAFT, from
 * the document-order re-scrape (content/legacy/pages-targeted/*.json).
 *
 *  - Original Wix asset URLs (never a cropped rendition), through
 *    lib/media.ts at render time like every legacy image.
 *  - Only ever ADDS blocks, never edits or removes one. The live page does
 *    not change until someone publishes the draft.
 *  - Placement: images that precede the page's first text go right after
 *    the hero; the rest become one gallery at the end. Exact interleaving
 *    isn't reproducible without rewriting the existing text blocks — the
 *    report lists pages where images were interleaved so QA can eyeball them.
 *  - Idempotent: an image URL already present in the page's blocks is skipped.
 *
 * Usage: pnpm exec tsx --env-file=.env.local scripts/add-batch1-images.ts [--dry-run]
 */
import fs from "node:fs";
import path from "node:path";
import { createServiceRoleDbClient } from "../lib/db/client";
import { imageIdentity, wixOriginalUrl, type ScrapedItem } from "../lib/legacy/clean";

const DRY_RUN = process.argv.includes("--dry-run");
const TARGETED_DIR = path.join(import.meta.dirname, "..", "content", "legacy", "pages-targeted");
const SLUGS = ["services/machine-shop", "services", "careers/hiring", "careers", "hse"];

const looksLikeFilename = (alt: string) => !alt || /\.(jpe?g|png|webp|gif|avif)$/i.test(alt);

async function main() {
  const db = createServiceRoleDbClient();
  const report: Record<string, unknown>[] = [];
  for (const slug of SLUGS) {
    const file = path.join(TARGETED_DIR, slug.replace(/\//g, "__") + ".json");
    if (!fs.existsSync(file)) {
      report.push({ slug, result: "no targeted scrape" });
      continue;
    }
    const items = (JSON.parse(fs.readFileSync(file, "utf-8")) as { items: ScrapedItem[] }).items;
    const { data: page } = await db.from("pages").select("id,title").eq("slug", slug).eq("locale", "en").maybeSingle();
    if (!page) {
      report.push({ slug, result: "page not found" });
      continue;
    }
    const { data: blocks, error } = await db.from("page_blocks").select("id,type,position,data").eq("page_id", page.id).order("position");
    if (error) throw error;
    const existingJson = JSON.stringify(blocks ?? []);

    const firstText = items.findIndex((i) => i.type === "heading" || i.type === "paragraph");
    let lastHeading = page.title;
    const leading: { url: string; alt: string }[] = [];
    const trailing: { url: string; alt: string }[] = [];
    let placedAtEnd = false;
    items.forEach((it, idx) => {
      if (it.type === "heading") lastHeading = it.text;
      if (it.type !== "image") return;
      const url = wixOriginalUrl(it.src);
      if (existingJson.includes(imageIdentity(url))) return; // already on the page
      const alt = looksLikeFilename(it.alt) ? lastHeading : it.alt;
      if (firstText === -1 || idx < firstText) leading.push({ url, alt });
      else {
        trailing.push({ url, alt });
        placedAtEnd = true;
      }
    });

    const heroPos = (blocks ?? []).find((b) => b.type === "hero_page")?.position ?? 0;
    const lastPos = Math.max(0, ...(blocks ?? []).map((b) => b.position));
    const toInsert: { type: string; position: number; data: Record<string, unknown> }[] = [];
    const asBlock = (imgs: { url: string; alt: string }[], position: number) =>
      imgs.length === 1
        ? { type: "image", position, data: { background: "cream", imageUrl: imgs[0].url, alt: imgs[0].alt, decorative: false } }
        : { type: "image_gallery", position, data: { background: "cream", images: imgs.map((i) => ({ url: i.url, alt: i.alt })) } };
    if (leading.length) toInsert.push(asBlock(leading, heroPos + 5));
    if (trailing.length) toInsert.push(asBlock(trailing, lastPos + 10));

    if (toInsert.length && !DRY_RUN) {
      const { error: insertError } = await db.from("page_blocks").insert(toInsert.map((b) => ({ page_id: page.id, ...b, data: b.data as never })));
      if (insertError) throw insertError;
    }
    report.push({
      slug,
      result: toInsert.length ? (DRY_RUN ? "would add" : "added") : "nothing to add",
      leading: leading.length,
      trailing: trailing.length,
      placed_at_end_not_in_original_position: placedAtEnd,
      alt_from_heading: [...leading, ...trailing].filter((i) => i.alt === lastHeading || i.alt === page.title).length,
    });
  }
  console.log(JSON.stringify(report, null, 1));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
