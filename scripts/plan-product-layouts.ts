/**
 * Dry-run planner for the product-layout re-import (W2/W3). READ-ONLY: it
 * reads the saved visual-order scrape and the current database, and writes
 * only local files under docs/qa/ — a JSON + HTML report and the candidate
 * migration SQL (one compare-and-set guarded block per product). It never
 * writes to the database.
 *
 * Usage: pnpm exec tsx --env-file=.env.local scripts/plan-product-layouts.ts
 *   --published   plan the 3 published products only (default: drafts only)
 */
import fs from "node:fs";
import path from "node:path";
import { createServiceRoleDbClient } from "../lib/db/client";
import { LEGACY_ENTRIES } from "../lib/legacy/batch2-manifest";
import { findChromeImages, type ScrapedPage } from "../lib/legacy/map";
import { mapProductLayout, type MappedProductLayout } from "../lib/legacy/map-layout";
import { planProduct, productSql, type DbProduct, type PreviousImport, type ProductPlan } from "../lib/legacy/plan-layout";
import { LINKED_SECTIONS, isLinkedSectionType } from "../lib/products/layout";

const ROOT = path.join(import.meta.dirname, "..");
const PAGES = path.join(ROOT, "content", "legacy", "pages-products");
const OUT = path.join(ROOT, "docs", "qa");
const PUBLISHED_ONLY = process.argv.includes("--published");

function loadPages() {
  return fs
    .readdirSync(PAGES)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(PAGES, f), "utf8")) as ScrapedPage & { slug: string });
}

function previousImports(): Map<string, PreviousImport> {
  const lastRun = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "legacy", "pages-batch2", "_last-run.json"), "utf8")) as {
    plan: { table: string; slug: string; payload?: Record<string, unknown> }[];
  };
  const out = new Map<string, PreviousImport>();
  for (const r of lastRun.plan) {
    if (r.table !== "products" || !r.payload) continue;
    const p = r.payload as Record<string, unknown>;
    out.set(r.slug, {
      summary: (p.summary as string | null) ?? null,
      diagramImageUrl: (p.diagramImageUrl as string | null) ?? null,
      videoUrl: (p.videoUrl as string | null) ?? null,
      brochurePdfUrl: (p.brochurePdfUrl as string | null) ?? null,
      model3dUrl: (p.model3dUrl as string | null) ?? null,
      benefits: (p.benefits as { title: string }[]) ?? [],
      blocks: ((p.blocks as { type: string; data: never }[]) ?? []).map((b) => ({ type: b.type, data: b.data })),
    });
  }
  return out;
}

const describeBefore = (db: DbProduct, hasBody: boolean, nBenefits: number, nSpecs: number): string[] => {
  const fixed = ["Hero", nBenefits ? `Benefits (${nBenefits})` : null, db.video_url ? "Video" : null, "How it works + PDF/3D", hasBody ? "Body" : null, nSpecs ? `Specifications (${nSpecs})` : null];
  return [...fixed.filter((x): x is string => Boolean(x)), ...db.blocks.map((b) => `+ ${b.type}`)];
};

const describeAfter = (m: MappedProductLayout): string[] => [
  "Hero",
  ...m.layout.map((r) => {
    const title = typeof r.data.title === "string" && r.data.title ? ` “${r.data.title}”` : "";
    const label = isLinkedSectionType(r.type) ? LINKED_SECTIONS[r.type].label : r.type;
    return `${r.is_visible ? "" : "(hidden) "}${label}${title}`;
  }),
];

async function main() {
  const pages = loadPages();
  const ctx = { chromeImages: findChromeImages(pages) };
  const prev = previousImports();
  const entryBySlug = new Map(LEGACY_ENTRIES.filter((e) => e.slug).map((e) => [e.slug!, e]));

  // Either the live database (service-role key) or a read-only snapshot taken another way
  // (--snapshot <file>: products/benefits/specs/blocks as plain JSON arrays).
  const snapIdx = process.argv.indexOf("--snapshot");
  type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  let products: Row[], benefits: Row[], specs: Row[], blocks: Row[];
  if (snapIdx >= 0) {
    const snap = JSON.parse(fs.readFileSync(process.argv[snapIdx + 1], "utf8"));
    ({ products, benefits, specs, blocks } = { products: snap.products ?? [], benefits: snap.benefits ?? [], specs: snap.specs ?? [], blocks: snap.blocks ?? [] });
  } else {
    const db = createServiceRoleDbClient();
    const [pr, be, sp, bl] = await Promise.all([
      db.from("products").select("id,slug,status,updated_at,summary,diagram_image_url,video_url,brochure_pdf_url,model_3d_url,body").eq("locale", "en"),
      db.from("product_benefits").select("product_id,title,position,updated_at").order("position"),
      db.from("product_specs").select("product_id").order("position"),
      db.from("product_blocks").select("product_id,type,is_visible,data,position,updated_at").order("position"),
    ]);
    for (const e of [pr.error, be.error, sp.error, bl.error]) if (e) throw e;
    products = pr.data ?? [];
    benefits = be.data ?? [];
    specs = sp.data ?? [];
    blocks = bl.data ?? [];
  }

  const stamp = (rows: { updated_at: string }[]) => ({ count: rows.length, max: rows.reduce<string | null>((m, r) => (m === null || r.updated_at > m ? r.updated_at : m), null) });
  const results: { plan: ProductPlan; mapped: MappedProductLayout; before: string[]; after: string[]; sql: string }[] = [];
  const notPlanned: { slug: string; reason: string }[] = [];

  for (const p of products) {
    const page = pages.find((x) => x.slug === p.slug);
    const entry = entryBySlug.get(p.slug);
    if (!page || !entry) {
      notPlanned.push({ slug: p.slug, reason: !page ? "no visual-order scrape (not a Wix product page)" : "not in the legacy manifest" });
      continue;
    }
    const isPublished = p.status === "published";
    if (isPublished !== PUBLISHED_ONLY) continue;
    const myBenefits = benefits.filter((b) => b.product_id === p.id) as { title: string; updated_at: string }[];
    const myBlocks = blocks.filter((b) => b.product_id === p.id) as { updated_at: string }[];
    const row: DbProduct = {
      id: p.id,
      slug: p.slug,
      status: p.status,
      updated_at: p.updated_at,
      summary: p.summary,
      diagram_image_url: p.diagram_image_url,
      video_url: p.video_url,
      brochure_pdf_url: p.brochure_pdf_url,
      model_3d_url: p.model_3d_url,
      benefits: myBenefits,
      blocks: myBlocks as unknown as DbProduct["blocks"],
      specsCount: specs.filter((x) => x.product_id === p.id).length,
      benefitsStamp: stamp(myBenefits),
      blocksStamp: stamp(myBlocks),
    };
    const mapped = mapProductLayout(entry, page, ctx);
    const plan = planProduct(mapped, row, prev.get(p.slug) ?? null);
    const nSpecs = specs.filter((s) => s.product_id === p.id).length;
    results.push({
      plan,
      mapped,
      before: describeBefore(row, Boolean(p.body), myBenefits.length, nSpecs),
      after: describeAfter(mapped),
      sql: plan.action === "apply" ? productSql(plan, row, mapped) : "",
    });
  }

  fs.mkdirSync(path.join(OUT, "preview"), { recursive: true });
  // What each product WOULD look like: the inputs a local preview route needs to render it without any database write.
  for (const r of results) {
    const fields = Object.fromEntries(r.plan.fieldChanges.map((c) => [c.field, c.to]));
    fs.writeFileSync(
      path.join(OUT, "preview", `${r.plan.slug}.json`),
      JSON.stringify({ slug: r.plan.slug, name: r.mapped.name, fields, benefits: r.plan.benefitsChange?.rows ?? null, layout: r.plan.layoutApplied ? r.plan.layout : null }, null, 1),
    );
  }
  fs.mkdirSync(OUT, { recursive: true });
  const tag = PUBLISHED_ONLY ? "published" : "drafts";
  fs.writeFileSync(
    path.join(OUT, `product-layout-dryrun-${tag}.json`),
    JSON.stringify({ generated_at: new Date().toISOString(), notPlanned, products: results.map((r) => ({ ...r.plan, before: r.before, after: r.after, flags: r.mapped.flags })) }, null, 1),
  );
  const sql = results.filter((r) => r.sql).map((r) => r.sql).join("\n\n");
  fs.writeFileSync(
    path.join(OUT, `product-layouts-${tag}.sql`),
    `-- Product layouts (${tag}). GENERATED by scripts/plan-product-layouts.ts; review before applying.\n-- Each block is guarded: it skips itself if the product, its benefits or its blocks changed since the dry-run.\n\n${sql}\n`,
  );
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const rows = results
    .map(
      ({ plan, mapped, before, after }) => `<tr><td><b>${esc(plan.slug)}</b><br>${plan.status}<br><i>${plan.action}</i></td>
<td><ol>${before.map((b) => `<li>${esc(b)}</li>`).join("")}</ol></td>
<td><ol>${after.map((b) => `<li>${esc(b)}</li>`).join("")}</ol></td>
<td>${plan.fieldChanges.map((c) => `<div>set <b>${c.field}</b></div>`).join("")}${plan.benefitsChange ? `<div>benefits ${plan.benefitsChange.from.length}→${plan.benefitsChange.to.length}</div>` : ""}${plan.layoutApplied ? "<div>layout written</div>" : `<div>${esc(plan.layoutNote ?? "")}</div>`}
${plan.keptHumanEdits.map((k) => `<div class=warn>kept human edit: ${k.field}</div>`).join("")}<small>${mapped.flags.join(", ")}</small></td></tr>`,
    )
    .join("\n");
  fs.writeFileSync(
    path.join(OUT, `product-layout-dryrun-${tag}.html`),
    `<!doctype html><meta charset=utf-8><title>Product layout dry-run (${tag})</title><style>body{font:13px system-ui;margin:20px}td,th{border:1px solid #bbb;padding:6px;vertical-align:top}table{border-collapse:collapse}ol{margin:0;padding-left:18px}.warn{color:#b00}</style><h1>Product layout dry-run — ${tag}</h1><table><tr><th>Product</th><th>Before</th><th>After</th><th>Changes</th></tr>${rows}</table>`,
  );
  const count = (a: ProductPlan["action"]) => results.filter((r) => r.plan.action === a).length;
  console.log(JSON.stringify({ tag, planned: results.length, apply: count("apply"), unchanged: count("unchanged"), skip: count("skip"), notPlanned: notPlanned.length }, null, 1));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
