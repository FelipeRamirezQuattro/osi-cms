import { createServerDbClient } from "@/lib/db/client";
import { listAllPages } from "@/lib/data/pages";
import { listAllProducts } from "@/lib/data/products";
import { listProductCategories } from "@/lib/data/taxonomy";
import { listEntityRows } from "@/lib/data/admin-entities";
import { adminHref, applicationHref, industryHref, newsHref, pageHref, productHref } from "@/lib/routes";

/**
 * On-demand, MVP-scale internal broken-link scan for the admin dashboard
 * (Task 13a) — deliberately not a persisted/maintained index, same
 * precedent `findMediaAssetUsages` (lib/data/media.ts) already
 * established: `JSON.stringify(block.data).includes(...)`-style scanning
 * across `page_blocks`/`shared_section_blocks`, appropriate at this
 * codebase's current page/block count. See docs/DECISIONS.md.
 *
 * The pure `extractInternalLinkCandidates`/`isIgnorableCandidate`/
 * `findBrokenPaths` helpers below have no DB dependency and are unit
 * tested directly; `listBrokenLinks`/`countBrokenLinks` are the thin
 * data-layer wrappers that fetch real rows.
 */

// Any JSON string value shaped like a site-relative path — deliberately
// simple (lowercase letters/digits/hyphens/slashes only): this both
// matches how every `lib/routes.ts` href builder actually generates a
// path, and naturally excludes non-candidates that would otherwise need
// their own exclusion rule — a file path with an extension (`.jpg`, a
// dot isn't in the character class), an absolute external URL (starts
// with "http", not "/"), and a protocol-relative URL (the second
// character has to be lowercase-alphanumeric, so "//cdn...." can't
// match).
const CANDIDATE_PATTERN = /"(\/[a-z0-9][a-z0-9-]*(?:\/[a-z0-9-]+)*)"/g;

export function extractInternalLinkCandidates(data: unknown): string[] {
  const json = JSON.stringify(data ?? null) ?? "";
  const pattern = new RegExp(CANDIDATE_PATTERN);
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(json))) {
    found.add(match[1]);
  }
  return [...found];
}

// Real, non-content routes a candidate path can legitimately point at —
// never flagged as broken even though they're not part of the
// pages/products/taxonomy/news slug universe checked below.
const IGNORED_PREFIXES = [
  "/admin",
  "/api",
  "/preview",
  "/styleguide",
  "/_next",
  "/uploads",
  "/images",
  "/assets",
  "/media",
  "/fonts",
  "/icons",
  "/favicon",
];

export function isIgnorableCandidate(path: string): boolean {
  return IGNORED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/** Candidates that are neither an ignorable non-content route nor a real, known slug — the actual "broken" set. */
export function findBrokenPaths(candidates: string[], knownPaths: ReadonlySet<string>): string[] {
  return candidates.filter((path) => !isIgnorableCandidate(path) && !knownPaths.has(path));
}

/**
 * Every internal path this site can actually resolve today, across every
 * status (a link to a still-draft product/page is not "broken" from an
 * editor's point of view — it resolves via preview and will resolve
 * publicly the moment it's published). Built entirely from existing
 * lib/data/* repository functions per this task's ruling, not raw
 * queries — see each import site.
 */
async function buildKnownPathSet(): Promise<Set<string>> {
  const [pages, products, categories, industries, applications, news, redirects] = await Promise.all([
    listAllPages(),
    listAllProducts(),
    listProductCategories(),
    listEntityRows("industries", [{ column: "position" }]),
    listEntityRows("applications", [{ column: "position" }]),
    listEntityRows("news_posts", [{ column: "created_at", ascending: false }]),
    listEntityRows("redirects", [{ column: "from_path" }]),
  ]);

  const categorySlugById = new Map(categories.map((category) => [category.id, category.slug]));
  const known = new Set<string>(["/", "/products", "/news", "/resources", "/search", "/contact"]);

  for (const page of pages) known.add(pageHref(page.slug));
  for (const product of products) {
    const categorySlug = product.category_id ? categorySlugById.get(product.category_id) : undefined;
    if (categorySlug) known.add(productHref(categorySlug, product.slug));
  }
  for (const row of industries) if (typeof row.slug === "string") known.add(industryHref(row.slug));
  for (const row of applications) if (typeof row.slug === "string") known.add(applicationHref(row.slug));
  for (const row of news) if (typeof row.slug === "string") known.add(newsHref(row.slug));
  for (const row of redirects) if (typeof row.from_path === "string") known.add(row.from_path);

  return known;
}

export type BrokenLinkEntry = { sourceLabel: string; sourceHref: string | null; href: string };

type PageBlockJoinRow = { id: string; type: string; data: unknown; pages: { id: string; title: string } | null };
type SharedSectionBlockJoinRow = {
  id: string;
  type: string;
  data: unknown;
  shared_sections: { id: string; title: string } | null;
};

/** Every broken-looking internal link found across page_blocks and shared_section_blocks, with enough context to jump to the offending block's editor. Dedupes identical (source, href) pairs. */
export async function listBrokenLinks(): Promise<BrokenLinkEntry[]> {
  const [knownPaths, db] = [await buildKnownPathSet(), createServerDbClient()];
  const entries: BrokenLinkEntry[] = [];
  const seen = new Set<string>();

  function record(sourceLabel: string, sourceHref: string | null, href: string) {
    const key = `${sourceLabel}::${href}`;
    if (seen.has(key)) return;
    seen.add(key);
    entries.push({ sourceLabel, sourceHref, href });
  }

  const { data: blocks, error: blocksError } = await db.from("page_blocks").select("id, type, data, pages(id, title)");
  if (blocksError) throw blocksError;
  for (const block of (blocks ?? []) as unknown as PageBlockJoinRow[]) {
    const page = block.pages;
    for (const href of findBrokenPaths(extractInternalLinkCandidates(block.data), knownPaths)) {
      record(
        page ? `${page.title} — ${block.type} block` : `(orphaned) ${block.type} block`,
        page ? adminHref("pages", page.id) : null,
        href,
      );
    }
  }

  const { data: sectionBlocks, error: sectionError } = await db
    .from("shared_section_blocks")
    .select("id, type, data, shared_sections(id, title)");
  if (sectionError) throw sectionError;
  for (const block of (sectionBlocks ?? []) as unknown as SharedSectionBlockJoinRow[]) {
    const section = block.shared_sections;
    for (const href of findBrokenPaths(extractInternalLinkCandidates(block.data), knownPaths)) {
      record(
        section ? `${section.title} (shared section) — ${block.type} block` : `(orphaned) ${block.type} block`,
        section ? adminHref("shared-sections", section.id) : null,
        href,
      );
    }
  }

  return entries;
}

export async function countBrokenLinks(): Promise<number> {
  return (await listBrokenLinks()).length;
}
