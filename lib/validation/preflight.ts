import { isSafeHref } from "@/lib/routes";

/**
 * Task 15: pure, DB-independent pieces of the publish preflight — no
 * database access here (see preflight.test.ts), so they're directly unit
 * testable. The DB-backed pieces (broken internal links, missing media
 * metadata) live in lib/data/publish-preflight.ts, which imports these
 * plus lib/data/link-audit.ts's exports and merges everything into one
 * PreflightSummary.
 *
 * "Communicate impact, don't block" (the task-15 acceptance criterion):
 * every check here is a *warning*, never an error — the one hard-block
 * check (invalid block data) is validateBlockList (lib/validation/
 * blocks.ts), already enforced at save time and re-run verbatim by
 * lib/data/publish-preflight.ts for symmetry, not duplicated here.
 */

export type PreflightBlockInput = { type: string; data: Record<string, unknown> };

export type PreflightWarning = { code: string; message: string; blockIndex?: number };

// --- Duplicate anchors -----------------------------------------------------

/**
 * Every block accepts an optional `anchorId` (lib/blocks/common.ts's
 * blockCommonSchema, flattened into `page_blocks.data`) for in-page
 * anchor links. Two blocks sharing one anchor id means an in-page link
 * to it resolves to whichever element the browser finds first — a silent
 * breakage, not a crash, so this is a warning rather than something
 * validateBlockList itself rejects.
 */
export type DuplicateAnchorGroup = { anchorId: string; blockIndexes: number[] };

/** The structured result (anchor id + every block index sharing it) — kept separate from findDuplicateAnchorIds' PreflightWarning[] so tests can assert on the actual grouping, not just a rendered message string. */
export function findDuplicateAnchorGroups(blocks: PreflightBlockInput[]): DuplicateAnchorGroup[] {
  const blockIndexesByAnchor = new Map<string, number[]>();

  blocks.forEach((block, index) => {
    const raw = block.data?.anchorId;
    const anchor = typeof raw === "string" ? raw.trim() : "";
    if (!anchor) return;
    const list = blockIndexesByAnchor.get(anchor) ?? [];
    list.push(index);
    blockIndexesByAnchor.set(anchor, list);
  });

  const groups: DuplicateAnchorGroup[] = [];
  for (const [anchorId, blockIndexes] of blockIndexesByAnchor) {
    if (blockIndexes.length > 1) groups.push({ anchorId, blockIndexes });
  }
  return groups;
}

export function findDuplicateAnchorIds(blocks: PreflightBlockInput[]): PreflightWarning[] {
  return findDuplicateAnchorGroups(blocks).map(({ anchorId, blockIndexes }) => ({
    code: "duplicate_anchor",
    message: `Anchor "${anchorId}" is used by ${blockIndexes.length} blocks (blocks ${blockIndexes.map((i) => i + 1).join(", ")}) — in-page links to it will only reach the first one.`,
  }));
}

// --- Unsafe links -----------------------------------------------------------

// Any object key that plausibly holds a link — matches this codebase's
// actual field-naming convention across every block/entity schema (see
// lib/admin/field-input-attrs.ts's comment on the same convention):
// `href`, `url`, `cta_url`, `ctaUrl`, `link`, etc.
const LINK_KEY_PATTERN = /(?:url|href|link)$/i;

/** Recursively walks arbitrary block `data`, flagging string values under a link-shaped key that `isSafeHref` rejects (javascript:/data: schemes, malformed URLs, stray whitespace, etc.). */
export function findUnsafeLinksInData(data: unknown): string[] {
  const unsafe: string[] = [];

  function walk(value: unknown, lastKey: string) {
    if (value == null) return;
    if (typeof value === "string") {
      if (!LINK_KEY_PATTERN.test(lastKey)) return;
      const trimmed = value.trim();
      if (!trimmed) return;
      if (!isSafeHref(trimmed, { allowAnchor: true, allowContact: true })) unsafe.push(trimmed);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) walk(item, lastKey);
      return;
    }
    if (typeof value === "object") {
      for (const [key, v] of Object.entries(value as Record<string, unknown>)) walk(v, key);
    }
  }

  walk(data, "");
  return unsafe;
}

export function findUnsafeLinksInBlocks(blocks: PreflightBlockInput[]): PreflightWarning[] {
  const warnings: PreflightWarning[] = [];
  blocks.forEach((block, index) => {
    for (const href of findUnsafeLinksInData(block.data)) {
      warnings.push({
        code: "unsafe_link",
        blockIndex: index,
        message: `Block ${index + 1} (${block.type}) has an unsafe or malformed link: "${href}".`,
      });
    }
  });
  return warnings;
}

// --- Image URL extraction (for the missing-alt-text check) -----------------

// Every image field in this codebase stores a full absolute URL (legacy
// media stays on the legacy host per CLAUDE.md constraint 3; admin
// uploads are Supabase Storage public URLs) — never a relative path —
// so matching "http(s):// ... .<image-extension>" inside the block's
// stringified JSON reliably finds every image reference regardless of
// which field name a given block type uses for it.
const IMAGE_URL_PATTERN = /"(https?:\/\/[^"\s]+\.(?:jpe?g|png|webp|gif))"/gi;

export function extractImageUrls(data: unknown): string[] {
  const json = JSON.stringify(data ?? null) ?? "";
  const pattern = new RegExp(IMAGE_URL_PATTERN);
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(json))) found.add(match[1]);
  return [...found];
}

export function extractImageUrlsFromBlocks(blocks: PreflightBlockInput[]): string[] {
  const found = new Set<string>();
  for (const block of blocks) for (const url of extractImageUrls(block.data)) found.add(url);
  return [...found];
}

// --- Aggregation -------------------------------------------------------------

export type PreflightSummary = {
  errors: PreflightWarning[];
  warnings: PreflightWarning[];
};

/** The synchronous, DB-independent half of the preflight — see lib/data/publish-preflight.ts for the full thing (adds broken-link + missing-alt checks, which need the database). */
export function runSyncPreflightChecks(blocks: PreflightBlockInput[]): PreflightWarning[] {
  return [...findDuplicateAnchorIds(blocks), ...findUnsafeLinksInBlocks(blocks)];
}
