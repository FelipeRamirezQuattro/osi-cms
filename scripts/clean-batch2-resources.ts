/**
 * Resource titles for the batch-2 PDFs (QA, Oct 13: "products listed under
 * Resources"). Every imported resource already has a distinct file URL, so
 * nothing is merged; what was wrong is the TITLE: a product datasheet was
 * titled just "Tubing Screen" (it reads as the product itself in the list),
 * and the 37 Wellbore Diagram PDFs were all "Wellbore Diagrams PDF".
 *
 *  - product-linked: "<Product name> — datasheet" (or — case study / — poster /
 *    — <the label on the Wix page>)
 *  - Wellbore Diagrams: "Wellbore diagram — <label from the page>" (the label
 *    sits next to each PDF link; see foldLinks)
 *  - nothing is deleted or re-linked; status stays draft. Only rows batch 2
 *    created and nobody has edited since are touched.
 *  - the report lists every resource that stays unlinked and why.
 *
 * Usage: pnpm exec tsx --env-file=.env.local scripts/clean-batch2-resources.ts [--dry-run]
 */
import fs from "node:fs";
import path from "node:path";
import { createServiceRoleDbClient } from "../lib/db/client";
import { foldLinks, textSimilarity, type ScrapedPage } from "../lib/legacy/map";

const DRY_RUN = process.argv.includes("--dry-run");
const DIR = path.join(import.meta.dirname, "..", "content", "legacy", "pages-batch2");

const GENERIC = /^(|brochure|datasheet|data sheet|pdf|document|download)$/i;
const clean = (s: string) => s.replace(/ /g, " ").replace(/\s+/g, " ").trim();
const sentenceCase = (t: string) => (t === t.toUpperCase() ? t.charAt(0) + t.slice(1).toLowerCase() : t);

/** Wix labels abbreviate ("ESP VD Flex Tool", "GasLift"); expand before comparing to the product name. */
const expand = (s: string) => clean(s).toLowerCase().replace(/\bvd\b/g, "vortex desander").replace(/gaslift/g, "gas lift");

function wordFor(label: string, productName: string | null): string {
  const l = clean(label);
  if (GENERIC.test(l)) return "datasheet";
  if (/^case study$/i.test(l)) return "case study";
  // The label just names the product (often abbreviated) → it IS the product's datasheet.
  if (productName && textSimilarity(expand(l), expand(productName)) >= 0.5) return "datasheet";
  return sentenceCase(l);
}

async function main() {
  const db = createServiceRoleDbClient();
  const state = JSON.parse(fs.readFileSync(path.join(DIR, "_import-state.json"), "utf-8")) as {
    resources: Record<string, { id: string; updated_at: string }>;
  };
  const lastRun = JSON.parse(fs.readFileSync(path.join(DIR, "_last-run.json"), "utf-8")) as {
    extra_pdfs: { url: string; text: string; from: string[] }[];
  };
  const labelByUrl = new Map(lastRun.extra_pdfs.map((p) => [p.url, clean(p.text)]));

  // Wellbore Diagrams: PDF link → the label printed next to it.
  const wellbore = JSON.parse(fs.readFileSync(path.join(DIR, "PUB-004.json"), "utf-8")) as ScrapedPage;
  for (const it of foldLinks(wellbore.items)) {
    if (it.type === "paragraph" && it.href) labelByUrl.set(it.href, clean(it.text));
  }

  const { data: rows, error } = await db.from("resources").select("id,title,kind,product_id,file_url,status,updated_at,products(name)");
  if (error) throw error;
  const ownedByUrl = new Map(Object.entries(state.resources).map(([url, v]) => [url, v]));

  const changes: { id: string; from: string; to: string }[] = [];
  const skipped: { title: string; reason: string }[] = [];
  const unlinked: { title: string; file: string }[] = [];

  for (const r of rows ?? []) {
    const st = ownedByUrl.get(r.file_url);
    if (!st || st.id !== r.id) continue; // not created by batch 2
    if (r.status !== "draft" || r.updated_at !== st.updated_at) {
      skipped.push({ title: r.title, reason: "edited or no longer draft" });
      continue;
    }
    const product = (r.products as { name: string } | null)?.name ?? null;
    const label = labelByUrl.get(r.file_url) ?? "";
    let title = r.title;
    if (product) {
      title = `${product} — ${wordFor(label, product)}`;
    } else if (wellbore.pdfs.some((p) => p.url === r.file_url) && label) {
      title = `Wellbore diagram — ${label}`;
    }
    if (!product) unlinked.push({ title, file: r.file_url.split("/").pop() ?? r.file_url });
    if (title !== r.title) changes.push({ id: r.id, from: r.title, to: title });
  }

  if (!DRY_RUN) {
    for (const c of changes) {
      const { error: e } = await db.from("resources").update({ title: c.to }).eq("id", c.id);
      if (e) throw e;
      // Our own change must not read as "edited in admin" on a later import.
      const row = (rows ?? []).find((r) => r.id === c.id)!;
      const { data: fresh } = await db.from("resources").select("updated_at").eq("id", c.id).single();
      state.resources[row.file_url].updated_at = fresh!.updated_at;
    }
    fs.writeFileSync(path.join(DIR, "_import-state.json"), JSON.stringify(state, null, 2));
  }
  const report = { dry_run: DRY_RUN, retitled: changes.length, skipped, still_unlinked: unlinked.length, changes, unlinked };
  fs.writeFileSync(path.join(DIR, "_resources-cleanup.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ dry_run: DRY_RUN, retitled: changes.length, skipped: skipped.length, still_unlinked: unlinked.length }));
  console.log(changes.slice(0, 8).map((c) => `  ${c.from}  →  ${c.to}`).join("\n"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
