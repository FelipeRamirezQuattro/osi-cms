/**
 * W6 — one row per product: what it has and what it still needs before it can
 * be published with confidence. Read-only (select queries only). Writes
 * docs/PRODUCT-READINESS.md and docs/product-readiness.csv, most complete
 * products first, so OSI can publish the strongest ones soonest.
 *
 * Run: pnpm report:product-readiness
 *
 * "Complete" is a content judgement, not a technical gate — the CMS lets any
 * product be published. The score is out of 100:
 *   summary 20 · hero image 20 · benefits 10 · how-it-works stages 10 ·
 *   specs 10 · applications 10 · datasheet/PDF 10 · extra content blocks 10.
 * "Needs content" = a required item is missing (category, summary, product
 * image, or any content section). Otherwise "Ready" at 70+ and "Almost" below:
 * 70 means the basics plus migrated extras, with only the structured sections
 * (stages, specs, applications) still empty — those need OSI's real data and
 * are never invented.
 * A 3D model is shown but not scored. Today it means a link to OSI's external
 * 3D viewer (portal.worldcast.io); no .glb/.usdz file exists yet.
 * "Hero image" is the product image the page shows: hero_image_url if set,
 * else the diagram image.
 *
 * Uses the service-role client for the same reason as the other reports
 * (lib/data/* needs a Next request context).
 */
import { writeFileSync } from "node:fs";
import { createServiceRoleDbClient } from "../lib/db/client";

const EXPECTED_PRODUCTS = 52;
const db = createServiceRoleDbClient();

function must<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data as T;
}

type Product = {
  id: string;
  name: string;
  slug: string;
  status: string;
  summary: string | null;
  hero_image_url: string | null;
  diagram_image_url: string | null;
  brochure_pdf_url: string | null;
  model_3d_url: string | null;
  video_url: string | null;
  product_categories: { name: string; slug: string } | null;
};

/** Placeholder rows someone created while trying the admin ("Test", "Test Product", "PRUEBA ..."). */
const isTestRecord = (p: Pick<Product, "name" | "slug">) => /^(test|prueba)\b/i.test(p.name.trim()) || /^(test|prueba)(-|$)/i.test(p.slug);

const countBy = (rows: { product_id: string }[]) => {
  const map = new Map<string, number>();
  for (const row of rows) map.set(row.product_id, (map.get(row.product_id) ?? 0) + 1);
  return map;
};

async function main() {
  const products = must(
    await db
      .from("products")
      .select("id, name, slug, status, summary, hero_image_url, diagram_image_url, brochure_pdf_url, model_3d_url, video_url, product_categories(name, slug)")
      .order("name"),
    "products",
  ) as unknown as Product[];

  const [benefits, stages, specs, applications, blocks, resources] = await Promise.all([
    db.from("product_benefits").select("product_id"),
    db.from("product_stages").select("product_id"),
    db.from("product_specs").select("product_id"),
    db.from("product_applications").select("product_id"),
    db.from("product_blocks").select("product_id, type, is_visible"),
    db.from("resources").select("product_id, kind, file_url").not("product_id", "is", null),
  ]).then((all) => all.map((result, i) => must(result as never, ["benefits", "stages", "specs", "applications", "blocks", "resources"][i])));

  const benefitCount = countBy(benefits as { product_id: string }[]);
  const stageCount = countBy(stages as { product_id: string }[]);
  const specCount = countBy(specs as { product_id: string }[]);
  const applicationCount = countBy(applications as { product_id: string }[]);
  const blockRows = blocks as { product_id: string; type: string; is_visible: boolean }[];
  const resourceRows = resources as { product_id: string; kind: string; file_url: string | null }[];

  const rows = products.map((p) => {
    const mine = blockRows.filter((b) => b.product_id === p.id && b.is_visible);
    const countType = (...types: string[]) => mine.filter((b) => types.includes(b.type)).length;
    const video = countType("video_embed") + (p.video_url ? 1 : 0);
    const gallery = countType("image_gallery", "image");
    const tables = countType("spec_table");
    const otherBlocks = mine.filter((b) => !["video_embed", "image_gallery", "image", "spec_table", "ar_model"].includes(b.type)).length;
    const extra = video + gallery + tables + otherBlocks;
    const pdfResources = resourceRows.filter((r) => r.product_id === p.id && r.file_url && ["brochure", "datasheet"].includes(r.kind)).length;

    const has = {
      summary: Boolean(p.summary?.trim()),
      benefits: (benefitCount.get(p.id) ?? 0) > 0,
      stages: (stageCount.get(p.id) ?? 0) > 0,
      specs: (specCount.get(p.id) ?? 0) > 0,
      // The product page shows the diagram image in its hero; hero_image_url is only an override.
      heroImage: Boolean(p.hero_image_url || p.diagram_image_url),
      extra: extra > 0,
      pdf: Boolean(p.brochure_pdf_url) || pdfResources > 0,
      model3d: Boolean(p.model_3d_url) || mine.some((b) => b.type === "ar_model"),
      applications: (applicationCount.get(p.id) ?? 0) > 0,
    };
    const score =
      (has.summary ? 20 : 0) + (has.heroImage ? 20 : 0) + (has.benefits ? 10 : 0) + (has.stages ? 10 : 0) +
      (has.specs ? 10 : 0) + (has.applications ? 10 : 0) + (has.pdf ? 10 : 0) + (has.extra ? 10 : 0);

    const required: string[] = [];
    // No category means no URL (/products/<category>/<slug>) and no sitemap entry.
    if (!p.product_categories) required.push("category");
    if (!has.summary) required.push("summary");
    if (!has.heroImage) required.push("product image");
    if (!(has.benefits || has.stages || has.specs || has.extra)) required.push("at least one content section (benefits, how it works, specs or extra blocks)");
    const recommended: string[] = [];
    if (!has.benefits) recommended.push("benefits");
    if (!has.stages) recommended.push("how it works / stages");
    if (!has.specs) recommended.push("specs");
    if (!has.applications) recommended.push("applications");
    if (!has.pdf) recommended.push("datasheet / PDF");
    if (!has.extra) recommended.push("extra content (video, gallery or tables)");

    const extraDetail = [video && `video ${video}`, gallery && `gallery ${gallery}`, tables && `tables ${tables}`, otherBlocks && `other ${otherBlocks}`].filter(Boolean).join(", ");
    const readiness = isTestRecord(p) ? "Test record" : p.status === "published" ? "Published" : required.length > 0 ? "Needs content" : score >= 70 ? "Ready" : "Almost";
    return { p, has, score, required, recommended, extraDetail, readiness };
  });

  // Test records go last whatever their score; they are not part of the catalog.
  rows.sort((a, b) => Number(a.readiness === "Test record") - Number(b.readiness === "Test record") || b.score - a.score || a.p.name.localeCompare(b.p.name));
  const catalog = rows.filter((r) => r.readiness !== "Test record").length;

  const tally = (label: string) => rows.filter((r) => r.readiness === label).length;
  const mark = (value: boolean) => (value ? "✓" : "—");
  const date = new Date().toISOString().slice(0, 10);

  const csvHeader = ["Rank", "Product", "Slug", "Category", "Status", "Readiness", "Score /100", "Summary", "Benefits", "Stages / how it works", "Specs", "Hero / product image", "Extra blocks", "Datasheet / PDF", "3D (external link)", "Applications", "Missing (required)", "Missing (recommended)"];
  const csvCell = (v: string | number) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const yn = (b: boolean) => (b ? "yes" : "no");
  const csv = [
    csvHeader,
    ...rows.map((r, i) => [i + 1, r.p.name, r.p.slug, r.p.product_categories?.name ?? "", r.p.status, r.readiness, r.score, yn(r.has.summary), yn(r.has.benefits), yn(r.has.stages), yn(r.has.specs), yn(r.has.heroImage), r.has.extra ? r.extraDetail : "no", yn(r.has.pdf), yn(r.has.model3d), yn(r.has.applications), r.required.join("; "), r.recommended.join("; ")]),
  ].map((cells) => cells.map(csvCell).join(",")).join("\n") + "\n";
  writeFileSync("docs/product-readiness.csv", csv);

  const md = [
    "# Product readiness",
    "",
    `Generated ${date} from the live catalog (read-only). ${catalog} products${catalog === EXPECTED_PRODUCTS ? "" : ` — **expected ${EXPECTED_PRODUCTS}**`}, plus ${rows.length - catalog} test record${rows.length - catalog === 1 ? "" : "s"} listed last (placeholders created in the admin, not real products). The same data is in [product-readiness.csv](product-readiness.csv) to send to OSI.`,
    "",
    "| Readiness | Products | Meaning |",
    "|---|---|---|",
    `| Published | ${tally("Published")} | Already live. |`,
    `| Ready | ${tally("Ready")} | Category, summary, product image and content are in place (score 70+). Can be published after a read-through; the structured sections (stages, specs, applications) are still empty and need OSI's data. |`,
    `| Almost | ${tally("Almost")} | Required items are in place but the score is under 70. |`,
    `| Needs content | ${tally("Needs content")} | Missing a category, summary, product image, or any content section. |`,
    `| Test record | ${tally("Test record")} | Placeholder rows, not part of the catalog. |`,
    "",
    "Score (out of 100): summary 20 · hero image 20 · benefits 10 · how it works 10 · specs 10 · applications 10 · datasheet/PDF 10 · extra blocks 10. 3D shows a link to OSI's external 3D viewer (portal.worldcast.io) and is not scored; no .glb/.usdz file exists yet. Sorted most complete first.",
    "",
    "| # | Product | Category | Status | Readiness | Score | Summary | Benefits | How it works | Specs | Hero | Extra | PDF | 3D | Apps | Missing before publishing |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
    ...rows.map((r, i) =>
      `| ${i + 1} | ${r.p.name} | ${r.p.product_categories?.name ?? "—"} | ${r.p.status} | ${r.readiness} | ${r.score} | ${mark(r.has.summary)} | ${mark(r.has.benefits)} | ${mark(r.has.stages)} | ${mark(r.has.specs)} | ${mark(r.has.heroImage)} | ${r.has.extra ? r.extraDetail : "—"} | ${mark(r.has.pdf)} | ${mark(r.has.model3d)} | ${mark(r.has.applications)} | ${[...r.required.map((m) => `**${m}**`), ...r.recommended].join(", ") || "nothing"} |`,
    ),
    "",
    "Bold items are required; the rest are recommended.",
    "",
  ].join("\n");
  writeFileSync("docs/PRODUCT-READINESS.md", md);

  console.log(`Catalog products: ${catalog}${catalog === EXPECTED_PRODUCTS ? "" : ` (expected ${EXPECTED_PRODUCTS})`}; rows including test records: ${rows.length}`);
  for (const label of ["Published", "Ready", "Almost", "Needs content", "Test record"]) console.log(`  ${label}: ${tally(label)}`);
  console.log("Wrote docs/PRODUCT-READINESS.md and docs/product-readiness.csv");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
