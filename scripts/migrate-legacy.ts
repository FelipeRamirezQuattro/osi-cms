/**
 * Phase 4 content migration — see master prompt §8.
 *
 * Reads content/legacy/pages/*.json and populates pages/page_blocks +
 * media_assets. Idempotent (upserts by slug, replaces blocks/images per
 * page) and re-runnable. Everything lands as status='draft' — a human
 * publishes (§8.7). Directory contacts/locations are migrated
 * separately by scripts/migrate-directory.ts (see that file for why).
 *
 * Usage:
 *   pnpm migrate:legacy            apply
 *   pnpm migrate:legacy --dry-run  report only, no writes
 */
import fs from "node:fs";
import path from "node:path";
import { createServiceRoleDbClient } from "../lib/db/client";
import type { Json } from "../lib/db/database.types";

const DRY_RUN = process.argv.includes("--dry-run");
const LEGACY_DIR = path.join(import.meta.dirname, "..", "content", "legacy", "pages");

interface LegacyPage {
  url: string;
  title: string;
  meta_description: string;
  og_title: string;
  headings: { level: string; text: string }[];
  paragraphs: string[];
  images: { src: string; alt: string }[];
  internal_links: string[];
  raw_text: string;
}

// Nav-chrome text the scraper captured as body paragraphs (see
// CONTENT-GAPS.md / master prompt §8.3) — dropped, never rendered.
const NAV_CHROME = new Set([
  "About Us",
  "Customer Cloud",
  "Careers",
  "Directory",
  "Downloads",
  "Hiring",
  "Services",
  "HSE",
  "More",
  "Get In Touch",
  "Contact Us",
]);

type PageSeed = {
  file: string;
  slug: string;
  title: string;
  template: "standard" | "legal";
  seoTitle?: string;
  seoDescription?: string;
  /** Extra blocks appended before the migrated rich_text (e.g. hero_page). */
  leadingBlocks?: { type: string; data: Record<string, Json> }[];
};

// Every legacy page except: home (Phase 3, bespoke), the 3 real products
// and services-4/Customer Cloud (Phase 3, out of scope per §3),
// osi-directory (migrate-directory.ts), and oxy/osi-internal (empty,
// see CONTENT-GAPS.md).
const PAGES: PageSeed[] = [
  {
    file: "about-us.json",
    slug: "about-us",
    title: "About Us",
    template: "standard",
    leadingBlocks: [{ type: "hero_page", data: { background: "navy", title: "About Us" } }],
  },
  {
    file: "careers.json",
    slug: "careers",
    title: "Careers",
    template: "standard",
    leadingBlocks: [{ type: "hero_page", data: { background: "navy", title: "Careers" } }],
  },
  {
    file: "hiring.json",
    slug: "careers/hiring",
    title: "Hiring",
    template: "standard",
    leadingBlocks: [{ type: "hero_page", data: { background: "navy", title: "Hiring" } }],
  },
  {
    file: "certifications.json",
    slug: "hse",
    title: "HSE",
    template: "standard",
    leadingBlocks: [{ type: "hero_page", data: { background: "navy", title: "HSE" } }],
  },
  {
    file: "sg-sst-policies.json",
    slug: "hse/sg-sst-policies",
    // Colombian workplace-safety policy content — genuinely Spanish
    // source, not translatable UI copy. Kept as-is (see DECISIONS.md).
    title: "SG-SST Policies",
    template: "standard",
    leadingBlocks: [{ type: "hero_page", data: { background: "navy", title: "SG-SST Policies" } }],
  },
  {
    file: "terms-and-conditions.json",
    slug: "terms-and-conditions",
    title: "Terms and Conditions",
    template: "legal",
    leadingBlocks: [
      { type: "hero_page", data: { background: "cream", title: "Terms and Conditions" } },
    ],
  },
  {
    file: "privacy-policy.json",
    slug: "privacy-policy",
    title: "Privacy Policy",
    template: "legal",
    leadingBlocks: [{ type: "hero_page", data: { background: "cream", title: "Privacy Policy" } }],
  },
  {
    file: "general-8.json",
    slug: "services/fluid-levels",
    title: "Fluid Levels",
    template: "standard",
    leadingBlocks: [{ type: "hero_page", data: { background: "navy", title: "Fluid Levels" } }],
  },
  {
    file: "copia-de-fluid-levels.json",
    slug: "services/pump-cards",
    title: "Pump Cards",
    template: "standard",
    leadingBlocks: [{ type: "hero_page", data: { background: "navy", title: "Pump Cards" } }],
  },
  {
    file: "machine-shop.json",
    slug: "services/machine-shop",
    title: "Machine Shop",
    template: "standard",
    leadingBlocks: [{ type: "hero_page", data: { background: "navy", title: "Machine Shop" } }],
  },
];

// services-1.json (the /services listing) is structured, not prose —
// handled separately below, not through the generic rich_text pipeline.
const SERVICES_LISTING: PageSeed = {
  file: "services-1.json",
  slug: "services",
  title: "Services",
  template: "standard",
};

function loadPage(file: string): LegacyPage {
  return JSON.parse(fs.readFileSync(path.join(LEGACY_DIR, file), "utf-8"));
}

function cleanText(s: string): string {
  return s.replace(/[​‎]/g, "").trim();
}

interface DocItem {
  type: "heading" | "paragraph";
  text: string;
}

// Matching happens on whitespace-stripped text, not the original
// strings — the scraper sometimes joins two DOM text nodes into one
// paragraphs[] entry with no separator ("- RPA(Robotic Process
// Automation)") where raw_text still has them as two lines ("- RPA\n
// (Robotic Process Automation)"). Stripping whitespace on both sides
// makes them match; the original (well-formed) text is still what gets
// stored, only the search uses the stripped fingerprint.
function stripWhitespace(s: string): string {
  return s.replace(/\s+/g, "");
}

/**
 * headings[] and paragraphs[] are separate flat arrays with no
 * positional link (see CONTENT-GAPS.md), but each array is individually
 * in correct top-to-bottom document order (the scraper walks the DOM
 * once per type). Merge them with a two-pointer scan over raw_text
 * rather than searching each text independently — a short heading like
 * "MACHINE" can be a substring of an earlier heading ("MACHINE SHOP"),
 * and an independent indexOf-per-text search latches onto that wrong,
 * earlier occurrence instead of the real later one. A single
 * monotonically-advancing cursor avoids that: by the time "MACHINE" is
 * looked up, the cursor already sits past "MACHINE SHOP".
 *
 * Also merges consecutive headings with nothing between them — Wix
 * split single headings across multiple <h2>s ("USEFUL"/"FOR"/"YOUR"/
 * "NEEDS", "PLASMA CUTTING"/"MACHINE"/"Combines precision..." etc.).
 */
function reconstructDocOrder(page: LegacyPage): DocItem[] {
  const headingQueue = page.headings.map((h) => h.text);
  const paragraphQueue = page.paragraphs.slice();
  const rawStripped = stripWhitespace(page.raw_text);
  let cursor = 0;
  let hi = 0;
  let pi = 0;
  const items: { type: "heading" | "paragraph"; text: string }[] = [];

  while (hi < headingQueue.length || pi < paragraphQueue.length) {
    // indexOf from `cursor` returning -1 means "not anywhere in the
    // remaining text," not "not yet" — cursor only moves forward, so
    // that's a definitive signal to skip this one item immediately.
    // Otherwise a single mismatched entry (smart quotes, a scraper
    // join artifact indexOf still can't reconcile, etc.) would stall
    // its whole queue and silently drop everything behind it.
    if (hi < headingQueue.length) {
      const hOffset = rawStripped.indexOf(stripWhitespace(headingQueue[hi]), cursor);
      if (hOffset === -1) {
        hi++;
        continue;
      }
    }
    if (pi < paragraphQueue.length) {
      const pOffset = rawStripped.indexOf(stripWhitespace(paragraphQueue[pi]), cursor);
      if (pOffset === -1) {
        pi++;
        continue;
      }
    }

    const h =
      hi < headingQueue.length
        ? rawStripped.indexOf(stripWhitespace(headingQueue[hi]), cursor)
        : Infinity;
    const p =
      pi < paragraphQueue.length
        ? rawStripped.indexOf(stripWhitespace(paragraphQueue[pi]), cursor)
        : Infinity;

    if (h <= p) {
      items.push({ type: "heading", text: headingQueue[hi] });
      cursor = h + stripWhitespace(headingQueue[hi]).length;
      hi++;
    } else {
      items.push({ type: "paragraph", text: paragraphQueue[pi] });
      cursor = p + stripWhitespace(paragraphQueue[pi]).length;
      pi++;
    }
  }

  const merged: DocItem[] = [];
  for (const item of items) {
    const last = merged[merged.length - 1];
    if (item.type === "heading" && last?.type === "heading") {
      last.text = `${last.text} ${item.text}`;
    } else {
      merged.push({ type: item.type, text: item.text });
    }
  }
  return merged;
}

/** Builds a Tiptap-shaped JSON doc (see components/blocks/rich-text.tsx). */
function buildRichTextDoc(items: DocItem[]): { doc: Json; droppedNavChrome: string[] } {
  const content: Json[] = [];
  let bulletBuffer: string[] = [];
  const droppedNavChrome: string[] = [];

  const flushBullets = () => {
    if (bulletBuffer.length === 0) return;
    content.push({
      type: "bulletList",
      content: bulletBuffer.map((text) => ({
        type: "listItem",
        content: [{ type: "paragraph", content: [{ type: "text", text }] }],
      })),
    });
    bulletBuffer = [];
  };

  for (const item of items) {
    const text = cleanText(item.text);
    if (!text) continue;

    if (item.type === "heading") {
      flushBullets();
      content.push({
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text }],
      });
      continue;
    }

    if (NAV_CHROME.has(text)) {
      droppedNavChrome.push(text);
      continue;
    }

    if (text.startsWith("-")) {
      bulletBuffer.push(text.replace(/^-\s*/, ""));
    } else {
      flushBullets();
      content.push({ type: "paragraph", content: [{ type: "text", text }] });
    }
  }
  flushBullets();

  return { doc: { type: "doc", content }, droppedNavChrome };
}

interface MigrationReportEntry {
  slug: string;
  sourceFile: string;
  blocksCreated: number;
  imagesInserted: number;
  droppedNavChrome: string[];
}

async function migratePage(
  db: ReturnType<typeof createServiceRoleDbClient>,
  seed: PageSeed,
  report: MigrationReportEntry[],
) {
  const page = loadPage(seed.file);
  const docItems = reconstructDocOrder(page);
  const { doc, droppedNavChrome } = buildRichTextDoc(docItems);

  const blocks: { type: string; data: Record<string, Json> }[] = [
    ...(seed.leadingBlocks ?? []),
    { type: "rich_text", data: { background: "cream", content: doc } },
  ];

  if (DRY_RUN) {
    report.push({
      slug: seed.slug,
      sourceFile: seed.file,
      blocksCreated: blocks.length,
      imagesInserted: page.images.length,
      droppedNavChrome,
    });
    return;
  }

  const { data: pageRow, error: pageError } = await db
    .from("pages")
    .upsert(
      {
        slug: seed.slug,
        locale: "en",
        title: seed.title,
        template: seed.template,
        seo_title: seed.seoTitle ?? page.title,
        seo_description: seed.seoDescription ?? (page.meta_description || undefined),
        status: "draft",
      },
      { onConflict: "slug,locale" },
    )
    .select("id")
    .single();
  if (pageError) throw pageError;

  await db.from("page_blocks").delete().eq("page_id", pageRow.id);
  let position = 0;
  for (const block of blocks) {
    position += 10;
    const { error } = await db
      .from("page_blocks")
      .insert({ page_id: pageRow.id, type: block.type, position, data: block.data });
    if (error) throw error;
  }

  let imagesInserted = 0;
  for (const image of page.images) {
    const { error } = await db
      .from("media_assets")
      .upsert(
        { url: image.src, alt: image.alt || null, source: "legacy" },
        { onConflict: "url", ignoreDuplicates: true },
      );
    if (!error) imagesInserted++;
  }

  report.push({
    slug: seed.slug,
    sourceFile: seed.file,
    blocksCreated: blocks.length,
    imagesInserted,
    droppedNavChrome,
  });
}

async function migrateServicesListing(
  db: ReturnType<typeof createServiceRoleDbClient>,
  report: MigrationReportEntry[],
) {
  // services-1.json is a tile list (Fluid Levels / Pump Cards / Machine
  // Shop), not prose — a link_columns block linking to the 3 pages
  // just migrated is more faithful than dumping it through rich_text.
  const seed = SERVICES_LISTING;
  const page = loadPage(seed.file);

  const blocks: { type: string; data: Record<string, Json> }[] = [
    { type: "hero_page", data: { background: "navy", title: "Services" } },
    {
      type: "link_columns",
      data: {
        background: "cream",
        columns: [
          {
            links: [
              { label: "Fluid Levels", href: "/services/fluid-levels" },
              { label: "Pump Cards", href: "/services/pump-cards" },
              { label: "Machine Shop", href: "/services/machine-shop" },
            ],
          },
        ],
      },
    },
  ];

  if (DRY_RUN) {
    report.push({
      slug: seed.slug,
      sourceFile: seed.file,
      blocksCreated: blocks.length,
      imagesInserted: page.images.length,
      droppedNavChrome: [],
    });
    return;
  }

  const { data: pageRow, error: pageError } = await db
    .from("pages")
    .upsert(
      {
        slug: seed.slug,
        locale: "en",
        title: seed.title,
        template: seed.template,
        seo_title: page.title,
        seo_description: page.meta_description || undefined,
        status: "draft",
      },
      { onConflict: "slug,locale" },
    )
    .select("id")
    .single();
  if (pageError) throw pageError;

  await db.from("page_blocks").delete().eq("page_id", pageRow.id);
  let position = 0;
  for (const block of blocks) {
    position += 10;
    const { error } = await db
      .from("page_blocks")
      .insert({ page_id: pageRow.id, type: block.type, position, data: block.data });
    if (error) throw error;
  }

  let imagesInserted = 0;
  for (const image of page.images) {
    const { error } = await db
      .from("media_assets")
      .upsert(
        { url: image.src, alt: image.alt || null, source: "legacy" },
        { onConflict: "url", ignoreDuplicates: true },
      );
    if (!error) imagesInserted++;
  }

  report.push({
    slug: seed.slug,
    sourceFile: seed.file,
    blocksCreated: blocks.length,
    imagesInserted,
    droppedNavChrome: [],
  });
}

function writeReport(entries: MigrationReportEntry[]) {
  const lines: string[] = [
    "# Migration report",
    "",
    `Generated by \`scripts/migrate-legacy.ts\`${DRY_RUN ? " (--dry-run — no writes made)" : ""} on ${new Date().toISOString()}.`,
    "",
    "All pages listed below land as `status='draft'` — nothing here is publicly visible until a human publishes it in the admin (Phase 5).",
    "",
    "## Pages mapped",
    "",
    "| Slug | Source file | Blocks | Images | Nav-chrome dropped |",
    "| --- | --- | --- | --- | --- |",
    ...entries.map(
      (e) =>
        `| /${e.slug} | ${e.sourceFile} | ${e.blocksCreated} | ${e.imagesInserted} | ${
          e.droppedNavChrome.length > 0 ? e.droppedNavChrome.join(", ") : "—"
        } |`,
    ),
    "",
    "## Not migrated by this script (handled elsewhere or intentionally excluded)",
    "",
    "- `home.json` — Phase 3 (bespoke, matches mockup p.1)",
    "- `gasreleasesystem.json`, `esp-chem-screen-osi.json`, `srp-sand-lift.json` — Phase 3 (`scripts/seed-products.ts`)",
    "- `osi-directory.json` — `scripts/migrate-directory.ts` (hand-curated, see that file for why)",
    "- `services-4.json` (Customer Cloud) — out of scope per master prompt §3, external link only",
    "- `oxy.json`, `osi-internal.json` — confirmed empty in the scrape, see CONTENT-GAPS.md",
    "",
  ];

  fs.writeFileSync(path.join(import.meta.dirname, "..", "docs", "MIGRATION-REPORT.md"), lines.join("\n"));
}

async function main() {
  const db = createServiceRoleDbClient();
  const report: MigrationReportEntry[] = [];

  for (const seed of PAGES) {
    await migratePage(db, seed, report);
  }
  await migrateServicesListing(db, report);

  writeReport(report);

  console.log(`${DRY_RUN ? "[dry run] " : ""}Migrated ${report.length} pages.`);
  console.log("See docs/MIGRATION-REPORT.md for details.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
