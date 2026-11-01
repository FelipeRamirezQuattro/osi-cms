/**
 * Dry-run of the page re-import (QA entregables 5/6). READ-ONLY: reads the
 * DOM snapshots in content/legacy/pages-dom, maps them to blocks with
 * lib/legacy/map-wix-pages.ts, validates every block with the same registry
 * schemas the admin's save uses, and writes
 *   docs/qa/pages-dryrun/<slug>.json   blocks + assets per page (feeds the local preview)
 *   docs/qa/pages-reimport-diff.md     the report to review before any migration
 *
 * Usage: pnpm exec tsx scripts/plan-wix-pages.ts [--before=docs/qa/pages-before.json]
 */
import fs from "node:fs";
import path from "node:path";
// @ts-expect-error jsdom ships no types and @types/jsdom is not a dependency (no new dependency for a script)
import { JSDOM } from "jsdom";
import { extractItems, orderForReading } from "../lib/legacy/wix-dom";
import { WIX_PAGE_SPECS, mapWixPage, type MappedWixPage } from "../lib/legacy/map-wix-pages";
import { validateBlockList } from "../lib/validation/blocks";

const ROOT = path.join(import.meta.dirname, "..");
const DOM_DIR = path.join(ROOT, "content", "legacy", "pages-dom");
const OUT = path.join(ROOT, "docs", "qa");

export function loadItems(file: string) {
  const html = fs.readFileSync(path.join(DOM_DIR, `${file}.html`), "utf8");
  return orderForReading(extractItems(new JSDOM(html).window.document.body));
}

export function planAll() {
  return WIX_PAGE_SPECS.map((spec) => {
    const mapped = mapWixPage(spec, loadItems(spec.file));
    const problem = validateBlockList(mapped.blocks.map((b) => ({ type: b.type, data: b.data })));
    return { spec, mapped, problem };
  });
}

// ---------- text coverage guard ----------

const KEY_SKIP = new Set(["type", "background", "spacingTop", "spacingBottom", "anchorId", "imageUrl", "url", "href", "alt", "logoUrl", "logoAlt", "videoUrl", "decorative", "alignment", "displayWidth", "level"]);
/** Letters and digits only, lower-case: spacing, punctuation and case differences (sentence-cased headings, "Email:" labels) do not matter. */
const squash = (t: string) => t.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

function corpusOf(node: unknown, out: string[] = []): string[] {
  if (typeof node === "string") out.push(node);
  else if (Array.isArray(node)) for (const n of node) corpusOf(n, out);
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) if (!KEY_SKIP.has(k)) corpusOf(v, out);
  }
  return out;
}

/** Every visible text run of the Wix snapshot (leaf text blocks and links), as the visitor reads it. */
export function sourceRuns(file: string): string[] {
  const doc = new JSDOM(fs.readFileSync(path.join(DOM_DIR, `${file}.html`), "utf8")).window.document;
  const runs: string[] = [];
  for (const el of Array.from(doc.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, a")) as Element[]) {
    if (el.closest("[data-hidden='1'], button, ul[aria-label*='ocial' i]")) continue;
    if (el.tagName === "LI" && el.querySelector("p")) continue;
    const text = (el.textContent ?? "").replace(/[\u200b-\u200f\u2060\ufeff]/g, "").replace(/\s+/g, " ").trim();
    if (squash(text)) runs.push(text);
  }
  return runs;
}

export interface Coverage {
  total: number;
  covered: number;
  chars: { total: number; covered: number };
  uncovered: { text: string; reason?: string }[];
  failing: string[];
}

export function textCoverage(spec: (typeof WIX_PAGE_SPECS)[number], mapped: MappedWixPage): Coverage {
  const corpus = squash(corpusOf(mapped.blocks).join(" "));
  // Join with no separator would let a run match across two unrelated strings; only whole runs are looked up, which is what we need.
  const runs = sourceRuns(spec.file);
  const result: Coverage = { total: runs.length, covered: 0, chars: { total: 0, covered: 0 }, uncovered: [], failing: [] };
  for (const text of runs) {
    const key = squash(text);
    const stripped = spec.movedLabels ? squash(text.replace(spec.movedLabels, "")) : key;
    result.chars.total += key.length;
    if (corpus.includes(key) || (stripped && corpus.includes(stripped))) {
      result.covered++;
      result.chars.covered += key.length;
      continue;
    }
    const allowed = spec.notCarried?.find((n) => n.match.test(text));
    result.uncovered.push({ text, reason: allowed?.reason });
    if (allowed) {
      result.covered++;
      result.chars.covered += key.length;
    } else result.failing.push(text);
  }
  return result;
}

const countText = (mapped: MappedWixPage) => {
  const c = { headings: 0, paragraphs: 0, lists: 0, listItems: 0, links: 0, bold: 0, images: 0, buttons: 0 };
  const walk = (n: unknown) => {
    if (!n || typeof n !== "object") return;
    const node = n as { type?: string; content?: unknown[]; marks?: { type: string }[] };
    if (node.type === "heading") c.headings++;
    if (node.type === "paragraph") c.paragraphs++;
    if (node.type === "bulletList") c.lists++;
    if (node.type === "listItem") c.listItems++;
    for (const m of node.marks ?? []) {
      if (m.type === "link") c.links++;
      if (m.type === "bold") c.bold++;
    }
    node.content?.forEach(walk);
  };
  for (const b of mapped.blocks) {
    if (b.type === "rich_text") walk((b.data as { content: unknown }).content);
    if (b.type === "image") c.images++;
    if (b.type === "image_gallery") c.images += (b.data as { images: unknown[] }).images.length;
    if (b.type === "button_group") c.buttons += (b.data as { buttons: unknown[] }).buttons.length;
    if (b.type === "feature_tiles") c.images += (b.data as { tiles: { imageUrl?: string }[] }).tiles.filter((t) => t.imageUrl).length;
  }
  return c;
};

function main() {
  const beforeArg = process.argv.find((a) => a.startsWith("--before="))?.slice(9);
  const before: Record<string, { type: string }[]> = {};
  if (beforeArg && fs.existsSync(beforeArg)) {
    for (const row of JSON.parse(fs.readFileSync(beforeArg, "utf8")) as { slug: string; blocks: { type: string }[] }[]) before[row.slug] = row.blocks;
  }
  fs.mkdirSync(path.join(OUT, "pages-dryrun"), { recursive: true });
  const plans = planAll();
  const lines: string[] = [
    "# Pages re-import — dry-run diff",
    "",
    `Generated by \`scripts/plan-wix-pages.ts\` on ${new Date().toISOString()}. Nothing was written to the database.`,
    "",
    "Source: DOM snapshots of the live Wix pages (`content/legacy/pages-dom/`), read by `lib/legacy/wix-dom.ts`, mapped by `lib/legacy/map-wix-pages.ts`.",
    "",
    "| Page | Blocks before → after | Images | Lists (items) | Links | Bold runs | Downloads/buttons | Text coverage | Schema check |",
    "|---|---|---|---|---|---|---|---|---|",
  ];
  const detail: string[] = [];
  let failed = false;
  for (const { spec, mapped, problem } of plans) {
    const cov = textCoverage(spec, mapped);
    if (cov.failing.length || problem) failed = true;
    fs.writeFileSync(path.join(OUT, "pages-dryrun", spec.slug.replace(/\//g, "__") + ".json"), JSON.stringify({ spec: { slug: spec.slug, title: spec.title, template: spec.template, mode: spec.mode ?? "replace" }, blocks: mapped.blocks, assets: mapped.assets }, null, 2));
    const c = countText(mapped);
    const b = before[spec.slug];
    const afterCount = mapped.mode === "append" ? (b?.length ?? 0) + mapped.blocks.length : mapped.blocks.length;
    lines.push(
      `| /${spec.slug} | ${b ? b.length : "?"} → ${afterCount}${mapped.mode === "append" ? " (appended)" : ""} | ${c.images} | ${c.lists} (${c.listItems}) | ${c.links} | ${c.bold} | ${c.buttons} | ${cov.covered}/${cov.total} runs (${Math.round((100 * cov.chars.covered) / Math.max(cov.chars.total, 1))}% of text)${cov.failing.length ? " **FAILS**" : ""} | ${problem ? "**FAILS: " + problem.message + "**" : "ok"} |`,
    );
    detail.push(
      `### /${spec.slug}`,
      "",
      `- Blocks before: ${b ? b.map((x) => x.type).join(", ") : "?"}`,
      `- Blocks after${mapped.mode === "append" ? " (added after the existing ones)" : ""}: ${mapped.blocks.map((x) => x.type).join(", ")}`,
      `- Assets to import: ${mapped.assets.filter((a) => a.kind === "image").length} image(s), ${mapped.assets.filter((a) => a.kind === "file").length} file(s)`,
      ...(mapped.flags.length ? [`- Flags: ${mapped.flags.join(", ")}`] : []),
      ...(mapped.imageOfText.length ? ["- Images that are pictures of text/documents:", ...mapped.imageOfText.map((x) => `  - ${x}`)] : []),
      ...(mapped.skipped.length ? ["- Not carried over:", ...mapped.skipped.map((x) => `  - ${x}`)] : []),
      `- Text coverage: ${cov.covered}/${cov.total} runs, ${cov.chars.covered}/${cov.chars.total} characters`,
      ...(cov.uncovered.length ? ["- Wix text not in the blocks:", ...cov.uncovered.map((u) => `  - "${u.text.slice(0, 120)}" — ${u.reason ?? "**NO REASON LISTED**"}`)] : []),
      "",
    );
  }
  // Spanish headings, sentence-cased from Wix's all-caps; the spelling (no accents on the caps ones) is Wix's.
  const spanish = plans
    .filter((p) => p.spec.slug === "hse/sg-sst-policies")
    .flatMap((p) => p.mapped.blocks.flatMap((b) => (b.type === "rich_text" ? ((b.data as { content: { content: { type: string; content?: { text: string }[] }[] } }).content.content.filter((n) => n.type === "heading").map((n) => n.content?.[0]?.text ?? "")) : [])));
  const notesFile = path.join(OUT, "pages-reimport-notes.md");
  const notes = fs.existsSync(notesFile) ? fs.readFileSync(notesFile, "utf8") : "";
  fs.writeFileSync(
    path.join(OUT, "pages-reimport-diff.md"),
    [
      ...lines,
      "",
      "## Per page",
      "",
      ...detail,
      "## Spanish headings on SG-SST (Wix's spelling kept, no accents added; OSI may want them)",
      "",
      ...spanish.map((t) => `- ${t}`),
      "",
      notes,
    ].join("\n"),
  );
  console.log(lines.join("\n"));
  if (failed) {
    console.error("\nPlan FAILED: a page has Wix text that is neither in the blocks nor listed as not carried over (see docs/qa/pages-reimport-diff.md).");
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
