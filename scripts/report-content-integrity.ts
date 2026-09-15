/**
 * Task 15's required CLI deliverable: a read-only, idempotent content-
 * integrity report — broken internal links + media-usage health (missing
 * alt text, orphaned/unreferenced uploads) — printable in CI or by hand
 * before a launch/review.
 *
 * Run: pnpm exec tsx --env-file=.env.local scripts/report-content-integrity.ts
 *      pnpm report:content-integrity   (same thing, via the package.json script)
 *
 * Why this duplicates a little query logic instead of calling
 * lib/data/link-audit.ts's listBrokenLinks() / lib/data/media.ts's
 * findMediaAssetUsages() directly: every lib/data/*.ts function goes
 * through lib/db/client.ts's createServerDbClient(), which calls
 * next/headers' cookies() — that throws outside an actual Next.js
 * request context, which a plain tsx script is not. Every existing
 * script in this repo (scripts/migrate-legacy.ts, scripts/seed-*.ts)
 * hits the same wall and works around it the same way: read/write
 * directly via createServiceRoleDbClient() instead. This script follows
 * that established convention for its own queries, while still reusing
 * every *pure* (DB-independent) piece those two files already export —
 * extractInternalLinkCandidates/isIgnorableCandidate/findBrokenPaths
 * from lib/data/link-audit.ts, validateAltRequirement from
 * lib/validation/media.ts — so the actual "is this broken/missing"
 * logic isn't duplicated, only the DB access shape is.
 *
 * `DIRECT_IMAGE_LOOKUPS` below is a hand-kept mirror of lib/data/
 * media.ts's private `DIRECT_LOOKUPS` (not exported, so it can't be
 * imported directly) — a short, stable list of "table.column holds a
 * direct image URL" pairs. If a future task adds a new direct image
 * column there, add it here too.
 */
import { createServiceRoleDbClient } from "../lib/db/client";
import {
  extractInternalLinkCandidates,
  findBrokenNavLinks,
  findBrokenPaths,
  isIgnorableCandidate,
  type NavItemRow,
} from "../lib/data/link-audit";
import { validateAltRequirement } from "../lib/validation/media";

type Db = ReturnType<typeof createServiceRoleDbClient>;

/**
 * Published-only: unlike lib/data/link-audit.ts's own buildKnownPathSet
 * (the admin dashboard's version, which deliberately treats a link to a
 * still-draft page/product as "not broken yet" — an editor's own
 * in-progress work, resolvable via preview), this CLI's whole purpose is
 * "what does the public actually see right now, before I publish
 * something new" — so a draft page must NOT count as a known-good
 * target here. A verification pass found this script previously
 * treated any status as valid, which could report zero broken links
 * while a nav item pointed at a page that 404s for every real visitor.
 */
async function buildKnownPathSet(db: Db): Promise<Set<string>> {
  const known = new Set<string>(["/", "/products", "/news", "/resources", "/search", "/contact"]);

  const [pages, categories, products, industries, applications, news, redirects] = await Promise.all([
    db.from("pages").select("slug").eq("status", "published"),
    db.from("product_categories").select("id, slug"),
    db.from("products").select("slug, category_id").eq("status", "published"),
    db.from("industries").select("slug").eq("status", "published"),
    db.from("applications").select("slug").eq("status", "published"),
    db.from("news_posts").select("slug").eq("status", "published"),
    db.from("redirects").select("from_path"),
  ]);
  for (const q of [pages, categories, products, industries, applications, news, redirects]) {
    if (q.error) throw q.error;
  }

  const categorySlugById = new Map((categories.data ?? []).map((c) => [c.id, c.slug]));
  for (const row of pages.data ?? []) {
    known.add(row.slug === "home" ? "/" : `/${row.slug}`);
  }
  for (const row of products.data ?? []) {
    const categorySlug = row.category_id ? categorySlugById.get(row.category_id) : undefined;
    if (categorySlug) known.add(`/products/${categorySlug}/${row.slug}`);
  }
  for (const row of industries.data ?? []) known.add(`/industries/${row.slug}`);
  for (const row of applications.data ?? []) known.add(`/applications/${row.slug}`);
  for (const row of news.data ?? []) known.add(`/news/${row.slug}`);
  for (const row of redirects.data ?? []) known.add(row.from_path);

  return known;
}

type BrokenLink = { source: string; href: string };

async function findBrokenLinks(db: Db, knownPaths: Set<string>): Promise<BrokenLink[]> {
  const results: BrokenLink[] = [];

  const { data: blocks, error: blocksError } = await db.from("page_blocks").select("type, data, pages(title)");
  if (blocksError) throw blocksError;
  for (const block of blocks ?? []) {
    const page = block.pages as { title: string } | null;
    const source = page ? `${page.title} — ${block.type} block` : `(orphaned) ${block.type} block`;
    for (const href of findBrokenPaths(extractInternalLinkCandidates(block.data), knownPaths)) {
      results.push({ source, href });
    }
  }

  const { data: sectionBlocks, error: sectionError } = await db
    .from("shared_section_blocks")
    .select("type, data, shared_sections(title)");
  if (sectionError) throw sectionError;
  for (const block of sectionBlocks ?? []) {
    const section = block.shared_sections as { title: string } | null;
    const source = section ? `${section.title} (shared section) — ${block.type} block` : `(orphaned) ${block.type} block`;
    for (const href of findBrokenPaths(extractInternalLinkCandidates(block.data), knownPaths)) {
      results.push({ source, href });
    }
  }

  // Header/footer/utility nav — never a block, so never covered by the
  // two scans above. A verification pass found production nav items
  // (/esp-packages, /locations, a bare "#") this report had never
  // looked at.
  const { data: navItems, error: navError } = await db.from("nav_items").select("id, parent_id, label, href, is_external");
  if (navError) throw navError;
  for (const item of findBrokenNavLinks((navItems ?? []) as NavItemRow[], knownPaths)) {
    results.push({ source: `"${item.label}" — navigation link`, href: item.href });
  }

  return results.filter((r) => !isIgnorableCandidate(r.href));
}

const DIRECT_IMAGE_LOOKUPS: { table: string; column: string }[] = [
  { table: "pages", column: "og_image_url" },
  { table: "products", column: "hero_image_url" },
  { table: "products", column: "diagram_image_url" },
  { table: "product_stages", column: "image_url" },
  { table: "news_posts", column: "cover_image_url" },
  { table: "directory_contacts", column: "photo_url" },
  { table: "resources", column: "thumbnail_url" },
  { table: "site_settings", column: "default_og_image" },
];

type MediaAssetRow = { id: string; url: string; alt: string | null; decorative: boolean; mime: string | null };

async function reportMedia(db: Db) {
  const { data: assets, error } = await db.from("media_assets").select("id, url, alt, decorative, mime");
  if (error) throw error;
  const rows = (assets ?? []) as MediaAssetRow[];

  const missingAlt = rows.filter(
    (row) => (row.mime === null || row.mime.startsWith("image/")) && validateAltRequirement("image", row.alt ?? "", row.decorative),
  );

  // Usage scan — same technique as lib/data/media.ts's findMediaAssetUsages,
  // re-run here against one already-fetched page_blocks set instead of
  // one query per asset.
  const { data: blocks, error: blocksError } = await db.from("page_blocks").select("data");
  if (blocksError) throw blocksError;
  const blockJson = (blocks ?? []).map((b) => JSON.stringify(b.data));

  const directRows = await Promise.all(
    DIRECT_IMAGE_LOOKUPS.map(async (lookup) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: lookupError } = await (db.from(lookup.table as any) as any).select(lookup.column);
      if (lookupError) throw lookupError;
      return (data ?? []).map((row: Record<string, unknown>) => row[lookup.column] as string | null);
    }),
  );
  const directUrls = new Set(directRows.flat().filter((v): v is string => Boolean(v)));

  const orphaned = rows.filter((row) => {
    if (directUrls.has(row.url)) return false;
    return !blockJson.some((json) => json.includes(row.url));
  });

  return { total: rows.length, missingAlt, orphaned };
}

/**
 * Supabase's `sb_secret_*` API keys are exchanged server-side for a
 * short-lived JWT before reaching PostgREST; a verification pass hit
 * `PGRST303: JWT issued at future` on an otherwise-correct local
 * `.env.local` service-role key — a transient clock-skew condition
 * between whatever minted that token and PostgREST's own clock, not
 * anything this script's code controls (re-running immediately without
 * any change succeeded). Retrying a couple of times with a short delay
 * turns that one-off infrastructure hiccup into "the report just works"
 * instead of a hard failure the operator has to notice is spurious and
 * re-run by hand right before a publish.
 */
function isTransientAuthClockError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string } | null)?.code;
  return code === "PGRST303" || /jwt issued at future/i.test(message);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const db = createServiceRoleDbClient();

  console.log("=== Content integrity report ===\n");

  const knownPaths = await buildKnownPathSet(db);
  const brokenLinks = await findBrokenLinks(db, knownPaths);
  console.log(`Broken internal links: ${brokenLinks.length}`);
  for (const link of brokenLinks) {
    console.log(`  - ${link.source}: "${link.href}"`);
  }

  console.log("");
  const media = await reportMedia(db);
  console.log(`Media assets: ${media.total} total`);
  console.log(`  Missing alt text (and not marked decorative): ${media.missingAlt.length}`);
  for (const asset of media.missingAlt) {
    console.log(`    - ${asset.url}`);
  }
  console.log(
    `  Orphaned (no page_blocks or direct-column reference found — see DIRECT_IMAGE_LOOKUPS for what "direct-column" covers): ${media.orphaned.length}`,
  );
  for (const asset of media.orphaned) {
    console.log(`    - ${asset.url}`);
  }

  console.log("\n=== Done ===");
  if (brokenLinks.length > 0 || media.missingAlt.length > 0) {
    process.exitCode = 1;
  }
}

const MAX_ATTEMPTS = 3;

async function runWithRetries() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await main();
      return;
    } catch (error) {
      if (attempt === MAX_ATTEMPTS || !isTransientAuthClockError(error)) throw error;
      const delayMs = attempt * 2000;
      console.warn(
        `Transient auth error (${(error as { code?: string }).code ?? "clock skew"}) — retrying in ${delayMs}ms (attempt ${attempt}/${MAX_ATTEMPTS})...`,
      );
      await sleep(delayMs);
    }
  }
}

runWithRetries().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
