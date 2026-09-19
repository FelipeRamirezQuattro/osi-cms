import { createServerDbClient } from "@/lib/db/client";
import { recordAudit } from "@/lib/data/audit";
import { adminHref } from "@/lib/routes";
import { validateAltRequirement, validateUploadFile, type MediaKind } from "@/lib/validation/media";
import type { Tables } from "@/lib/db/database.types";

export type MediaAsset = Tables<"media_assets">;

const BUCKET = "media";
const DEFAULT_PAGE_SIZE = 24;

/** Thrown for a caller-fixable problem (bad file, missing alt text) — the action layer surfaces `.message` verbatim. */
export class MediaValidationError extends Error {}

// --- Listing / browsing --------------------------------------------------

export type ListMediaAssetsOptions = {
  search?: string;
  folder?: string;
  tag?: string;
  kind?: MediaKind;
  limit?: number;
  offset?: number;
};

export type ListMediaAssetsResult = {
  assets: MediaAsset[];
  total: number;
};

/** Strips characters that would otherwise let a search term escape its `ilike` slot in a raw `.or()` filter string. */
function escapeOrFilterTerm(value: string): string {
  return value.replace(/[,()]/g, "").trim();
}

/**
 * Server-side paginated + filtered listing (Task 11 — the previous
 * version hard-capped at `limit(60)` with no offset, so any asset past
 * the 60th was permanently unreachable from either admin UI; see the
 * acceptance criterion "more than 60 assets remain browseable").
 */
export async function listMediaAssets(options: ListMediaAssetsOptions = {}): Promise<ListMediaAssetsResult> {
  const { search, folder, tag, kind, limit = DEFAULT_PAGE_SIZE, offset = 0 } = options;
  const db = createServerDbClient();
  let query = db.from("media_assets").select("*", { count: "exact" }).order("created_at", { ascending: false });

  const term = search ? escapeOrFilterTerm(search) : "";
  if (term) {
    const pattern = `*${term}*`;
    query = query.or(
      `title.ilike.${pattern},alt.ilike.${pattern},url.ilike.${pattern},filename.ilike.${pattern},caption.ilike.${pattern}`,
    );
  }
  if (folder) query = query.eq("folder", folder);
  if (tag) query = query.contains("tags", [tag]);

  // Every legacy row (all ~26 of them, today) predates `mime` ever being
  // populated (scripts/migrate-legacy.ts never set it) — a null mime is
  // treated as "probably an image" so the default picker view (kind:
  // "image") doesn't silently hide every pre-existing asset the moment
  // this filter is applied. Only a real "uploaded" document row (which
  // always has a real mime, see uploadMediaAsset below) is excluded.
  if (kind === "image") {
    query = query.or("mime.is.null,mime.like.image/*");
  } else if (kind === "document") {
    query = query.not("mime", "is", null).not("mime", "like", "image/*");
  }

  const safeLimit = Math.max(1, limit);
  query = query.range(offset, offset + safeLimit - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { assets: data ?? [], total: count ?? 0 };
}

export async function getMediaAssetById(id: string): Promise<MediaAsset | null> {
  const db = createServerDbClient();
  const { data, error } = await db.from("media_assets").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Dashboard count (Task 13a) for "missing required media metadata" —
 * image-kind assets with no alt text and not marked decorative. One query
 * narrows to image-kind, non-decorative candidates (same `mime.is.null,
 * mime.like.image/*` treat-legacy-null-as-image rule `listMediaAssets`
 * already uses), then reuses `validateAltRequirement` verbatim against
 * each row rather than re-deriving the "is this a violation" rule
 * separately — see docs/DECISIONS.md.
 */
export async function countMissingAltMedia(): Promise<number> {
  const db = createServerDbClient();
  const { data, error } = await db
    .from("media_assets")
    .select("alt, decorative")
    .eq("decorative", false)
    .or("mime.is.null,mime.like.image/*");
  if (error) throw error;
  return (data ?? []).filter((row) => validateAltRequirement("image", row.alt ?? "", row.decorative) !== null).length;
}

/**
 * Bulk URL -> alt/decorative lookup for the publish preflight's
 * "missing media metadata" check (lib/data/publish-preflight.ts, Task
 * 15) — given every image URL a page's blocks reference, which of those
 * are tracked media_assets rows missing required alt text. A URL with no
 * matching row (a legacy image resolved via lib/media.ts, never uploaded
 * through the admin) is simply absent from the result — per CLAUDE.md's
 * alt-text section, enforcement is scoped to the media library's upload
 * chokepoint, not every image reference site-wide, so an untracked
 * legacy URL isn't flagged here either.
 */
export async function listMediaAssetsByUrls(
  urls: string[],
): Promise<Pick<MediaAsset, "url" | "alt" | "decorative">[]> {
  if (urls.length === 0) return [];
  const db = createServerDbClient();
  const { data, error } = await db.from("media_assets").select("url, alt, decorative").in("url", urls);
  if (error) throw error;
  return data ?? [];
}

/** Distinct folder names in use, for the library/picker's folder filter dropdown. Fine to scan client-side at this table's size. */
export async function listMediaFolders(): Promise<string[]> {
  const db = createServerDbClient();
  const { data, error } = await db.from("media_assets").select("folder").not("folder", "is", null);
  if (error) throw error;
  const folders = new Set<string>();
  for (const row of data ?? []) {
    if (row.folder) folders.add(row.folder);
  }
  return Array.from(folders).sort();
}

/** Distinct tags in use, for the library/picker's tag filter. */
export async function listMediaTags(): Promise<string[]> {
  const db = createServerDbClient();
  const { data, error } = await db.from("media_assets").select("tags");
  if (error) throw error;
  const tags = new Set<string>();
  for (const row of data ?? []) {
    for (const tag of row.tags ?? []) tags.add(tag);
  }
  return Array.from(tags).sort();
}

// --- Upload (atomic storage + row creation) -------------------------------

export type UploadMediaMeta = {
  title?: string;
  alt?: string;
  decorative?: boolean;
  caption?: string;
  credit?: string;
  folder?: string;
  tags?: string[];
  width?: number;
  height?: number;
};

/**
 * Uploads a file to Storage, then creates its `media_assets` row.
 * Compensating-transaction: if the row insert fails, the just-uploaded
 * Storage object is removed so it never becomes an orphan with no DB
 * record pointing at it; if *that* cleanup also fails, both failures are
 * surfaced together (never silently swallowed) since at that point a
 * human needs to go clean up the bucket by hand.
 */
export async function uploadMediaAsset(file: File, meta: UploadMediaMeta = {}): Promise<MediaAsset> {
  const db = createServerDbClient();

  const validation = validateUploadFile(file);
  if (!validation.ok) {
    throw new MediaValidationError(validation.message);
  }
  const altError = validateAltRequirement(validation.kind, meta.alt ?? "", meta.decorative ?? false);
  if (altError) {
    throw new MediaValidationError(altError);
  }

  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
  const path = `${crypto.randomUUID()}${ext}`;

  const { error: uploadError } = await db.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = db.storage.from(BUCKET).getPublicUrl(path);

  const decorative = meta.decorative ?? false;

  const { data, error } = await db
    .from("media_assets")
    .insert({
      url: publicUrl,
      alt: decorative ? null : (meta.alt?.trim() || null),
      decorative,
      mime: file.type || null,
      title: meta.title?.trim() || file.name,
      filename: file.name,
      caption: meta.caption?.trim() || null,
      credit: meta.credit?.trim() || null,
      folder: meta.folder?.trim() || null,
      tags: meta.tags ?? [],
      width: meta.width ?? null,
      height: meta.height ?? null,
      file_size: file.size,
      source: "uploaded",
    })
    .select("*")
    .single();

  if (error) {
    const { error: cleanupError } = await db.storage.from(BUCKET).remove([path]);
    if (cleanupError) {
      // Both the row creation AND the cleanup failed — do not swallow
      // this. The object is now orphaned in Storage with no DB record;
      // log it loudly and say so in the thrown message rather than
      // reporting a plain "upload failed" that hides the leak.
      console.error(
        `[media] Orphaned storage object after failed upload: bucket="${BUCKET}" path="${path}" insertError="${error.message}" cleanupError="${cleanupError.message}"`,
      );
      throw new Error(
        `Upload row could not be created (${error.message}), and the uploaded file could not be removed either (${cleanupError.message}). It is orphaned in storage and needs manual cleanup (bucket "${BUCKET}", path "${path}").`,
      );
    }
    throw error;
  }

  await recordAudit("upload", "media_asset", data.id, { title: data.title, mime: data.mime, kind: validation.kind });
  return data;
}

// --- Metadata editing (no re-upload required) -----------------------------

export type MediaMetadataFields = {
  title: string | null;
  alt: string | null;
  decorative: boolean;
  caption: string | null;
  credit: string | null;
  folder: string | null;
  tags: string[];
};

export async function updateMediaAssetMetadata(id: string, fields: MediaMetadataFields): Promise<MediaAsset> {
  const db = createServerDbClient();
  const { data, error } = await db.from("media_assets").update(fields).eq("id", id).select("*").single();
  if (error) throw error;
  await recordAudit("update", "media_asset", id, { title: fields.title, decorative: fields.decorative });
  return data;
}

// --- Deletion (fixed: never silently deletes the row if Storage cleanup fails) ---

export async function deleteMediaAsset(id: string): Promise<void> {
  const db = createServerDbClient();
  const { data: asset, error: fetchError } = await db
    .from("media_assets")
    .select("url, source")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!asset) return;

  if (asset.source === "uploaded") {
    const path = asset.url.split(`/${BUCKET}/`).pop();
    if (path) {
      const { error: removeError } = await db.storage.from(BUCKET).remove([path]);
      if (removeError) {
        // Previously ignored (a real bug this task fixes): the object
        // removal's error was never checked, so a failed Storage delete
        // still fell through to deleting the DB row — silently orphaning
        // the file (unreferenced, unfindable) while its own row vanished.
        // Abort instead: the row (and its still-live public URL) stays
        // intact until the object is actually gone.
        throw new Error(
          `Could not remove the storage object at "${path}" in bucket "${BUCKET}" (${removeError.message}). The media asset row was NOT deleted.`,
        );
      }
    }
  }

  const { error } = await db.from("media_assets").delete().eq("id", id);
  if (error) throw error;
  await recordAudit("delete", "media_asset", id, { url: asset.url });
}

// --- Usage search (Task 11 ruling #3: an MVP-scale search, not a maintained tracking table) ---

export type MediaUsageSource =
  | "page_block"
  | "page_og_image"
  | "product"
  | "product_stage"
  | "news_post"
  | "directory_contact"
  | "resource"
  | "site_settings"
  | "branding_draft"
  | "branding_publication"
  | "branding_revision";

export type MediaUsage = {
  source: MediaUsageSource;
  id: string;
  label: string;
  editHref: string | null;
  /** Historical references are informative but do not prevent deletion. */
  blocking?: boolean;
};

type DirectLookupRow = Record<string, unknown> & { id: string };

type DirectLookup = {
  table: string;
  column: string;
  source: MediaUsageSource;
  select: string;
  label: (row: DirectLookupRow) => string;
  editHref: (row: DirectLookupRow) => string | null;
};

const DIRECT_LOOKUPS: DirectLookup[] = [
  {
    table: "pages",
    column: "og_image_url",
    source: "page_og_image",
    select: "id, title",
    label: (r) => `${r.title as string} (social image)`,
    editHref: (r) => adminHref("pages", r.id),
  },
  {
    table: "products",
    column: "hero_image_url",
    source: "product",
    select: "id, name",
    label: (r) => `${r.name as string} (hero image)`,
    editHref: (r) => adminHref("products", r.id),
  },
  {
    table: "products",
    column: "diagram_image_url",
    source: "product",
    select: "id, name",
    label: (r) => `${r.name as string} (diagram)`,
    editHref: (r) => adminHref("products", r.id),
  },
  {
    table: "product_stages",
    column: "image_url",
    source: "product_stage",
    select: "id, title, product_id",
    label: (r) => `Stage "${r.title as string}"`,
    editHref: (r) => adminHref("products", r.product_id as string),
  },
  {
    table: "news_posts",
    column: "cover_image_url",
    source: "news_post",
    select: "id, title",
    label: (r) => `${r.title as string} (news cover)`,
    editHref: (r) => adminHref("news", r.id),
  },
  {
    table: "directory_contacts",
    column: "photo_url",
    source: "directory_contact",
    select: "id, name",
    label: (r) => `${r.name as string} (directory photo)`,
    editHref: (r) => adminHref("directory", r.id),
  },
  {
    table: "resources",
    column: "thumbnail_url",
    source: "resource",
    select: "id, title",
    label: (r) => `${r.title as string} (resource thumbnail)`,
    editHref: (r) => adminHref("resources", r.id),
  },
  {
    table: "site_settings",
    column: "default_og_image",
    source: "site_settings",
    select: "id",
    label: () => "Site settings (default social image)",
    editHref: () => adminHref("settings"),
  },
];

/**
 * Finds every place a media URL is referenced, across page_blocks and
 * the handful of direct image-url columns on products/news/directory/
 * resources/settings/pages. `table` is a runtime string here (like
 * lib/data/admin-entities.ts's generic CRUD), so the Supabase call
 * necessarily leans on `any` at that one boundary.
 *
 * page_blocks.data is an arbitrary-shaped jsonb blob — one shape per
 * block type (lib/blocks/registry.ts) — with no single column path to
 * filter on server-side, so this fetches every block and matches
 * client-side instead. Acceptable at this project's current data volume
 * (controller ruling #3 for this task: an MVP-scale search, not an
 * indexed usage-tracking table); revisit if the page/block count grows
 * enough to make this slow.
 */
export async function findMediaAssetUsages(url: string, assetId?: string): Promise<MediaUsage[]> {
  const db = createServerDbClient();
  const usages: MediaUsage[] = [];

  const { data: blocks, error: blocksError } = await db
    .from("page_blocks")
    .select("id, type, page_id, data, pages(id, title)");
  if (blocksError) throw blocksError;
  for (const block of blocks ?? []) {
    if (!JSON.stringify(block.data).includes(url)) continue;
    const page = block.pages as { id: string; title: string } | null;
    usages.push({
      source: "page_block",
      id: block.id,
      label: page ? `${page.title} — ${block.type} block` : `(orphaned) ${block.type} block`,
      editHref: page ? adminHref("pages", page.id) : null,
    });
  }

  for (const lookup of DIRECT_LOOKUPS) {
    const { data, error } = await (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      db.from(lookup.table as any) as any
    )
      .select(lookup.select)
      .eq(lookup.column, url);
    if (error) throw error;
    for (const row of (data ?? []) as DirectLookupRow[]) {
      usages.push({
        source: lookup.source,
        id: String(row.id),
        label: lookup.label(row),
        editHref: lookup.editHref(row),
      });
    }
  }

  if (assetId) {
    const brandingLookups = [
      { table: "site_branding", source: "branding_draft", label: "Branding draft (primary logo)", blocking: true },
      { table: "site_branding_publications", source: "branding_publication", label: "Live branding (primary logo)", blocking: true },
      { table: "site_branding_revisions", source: "branding_revision", label: "Branding revision (historical logo)", blocking: false },
    ] as const;
    for (const lookup of brandingLookups) {
      const { data, error } = await (
        // Generic table iteration is deliberately confined to this boundary.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        db.from(lookup.table as any) as any
      ).select("id").eq("primary_logo_media_id", assetId);
      if (error) throw error;
      for (const row of data ?? []) {
        usages.push({
          source: lookup.source,
          id: String(row.id),
          label: lookup.label,
          editHref: lookup.blocking ? "/admin/branding" : null,
          blocking: lookup.blocking,
        });
      }
    }

    // The favicon lives only inside the config jsonb (no FK column like
    // the logo), so match it in JS rather than with a jsonb-path filter.
    const faviconLookups = [
      { table: "site_branding", source: "branding_draft", label: "Branding draft (favicon)" },
      { table: "site_branding_publications", source: "branding_publication", label: "Live branding (favicon)" },
    ] as const;
    for (const lookup of faviconLookups) {
      const { data, error } = await db.from(lookup.table).select("id, config");
      if (error) throw error;
      for (const row of data ?? []) {
        const favicon = (row.config as { favicon?: { mediaAssetId?: string | null } } | null)?.favicon;
        if (favicon?.mediaAssetId !== assetId) continue;
        usages.push({
          source: lookup.source,
          id: String(row.id),
          label: lookup.label,
          editHref: "/admin/branding",
          blocking: true,
        });
      }
    }
  }

  return usages;
}

// --- Protected deletion + replace-everywhere ------------------------------

export type DeleteMediaResult = { status: "deleted" } | { status: "blocked"; usages: MediaUsage[] };

/**
 * The delete path every caller should use (lib/actions/media.ts) — never
 * deletes an asset that's still referenced anywhere. "No media deletion
 * can break a live page unnoticed" (this task's acceptance criterion) is
 * enforced here, not just documented in a confirm() dialog.
 */
export async function deleteMediaAssetProtected(id: string): Promise<DeleteMediaResult> {
  const asset = await getMediaAssetById(id);
  if (!asset) return { status: "deleted" }; // already gone — matches deleteMediaAsset's prior no-op-on-missing behavior
  const usages = await findMediaAssetUsages(asset.url, asset.id);
  if (usages.some((usage) => usage.blocking !== false)) {
    return { status: "blocked", usages };
  }
  await deleteMediaAsset(id);
  return { status: "deleted" };
}

/**
 * Rewrites every reference to `oldUrl` (across page_blocks.data and the
 * direct image-url columns) to `newUrl`. page_blocks are rewritten via a
 * JSON-serialize / substring-replace / re-parse round trip rather than a
 * per-block-type-aware deep walk — safe here because a URL never
 * contains a raw `"` that would need re-escaping differently after the
 * swap, and simple enough to stay correct across all ~30 block types
 * without hand-coding a path into each one's schema.
 */
async function replaceMediaAssetEverywhere(
  oldUrl: string,
  newUrl: string,
): Promise<{ updatedBlocks: number; updatedColumns: number }> {
  const db = createServerDbClient();
  let updatedBlocks = 0;
  let updatedColumns = 0;

  const { data: blocks, error: blocksError } = await db.from("page_blocks").select("id, data");
  if (blocksError) throw blocksError;
  for (const block of blocks ?? []) {
    const serialized = JSON.stringify(block.data);
    if (!serialized.includes(oldUrl)) continue;
    const replaced = serialized.split(oldUrl).join(newUrl);
    const { error: updateError } = await db
      .from("page_blocks")
      .update({ data: JSON.parse(replaced) })
      .eq("id", block.id);
    if (updateError) throw updateError;
    updatedBlocks++;
  }

  for (const lookup of DIRECT_LOOKUPS) {
    const { data, error } = await (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      db.from(lookup.table as any) as any
    )
      .update({ [lookup.column]: newUrl })
      .eq(lookup.column, oldUrl)
      .select("id");
    if (error) throw error;
    updatedColumns += (data ?? []).length;
  }

  return { updatedBlocks, updatedColumns };
}

/**
 * The "replace everywhere, then allow deletion" flow: swaps every usage
 * of `oldAssetId`'s URL to `newAssetId`'s URL, then stamps the old asset
 * with what replaced it (so a later delete's own audit_log entry has a
 * self-contained trail even after the row is gone). Does NOT delete
 * `oldAssetId` itself — the caller re-attempts deleteMediaAssetProtected
 * afterward, which now succeeds since no usages remain.
 */
export async function replaceMediaAsset(oldAssetId: string, newAssetId: string): Promise<{ updated: number }> {
  if (oldAssetId === newAssetId) {
    throw new MediaValidationError("Choose a different asset to replace with.");
  }
  const [oldAsset, newAsset] = await Promise.all([getMediaAssetById(oldAssetId), getMediaAssetById(newAssetId)]);
  if (!oldAsset) throw new MediaValidationError("The asset being replaced no longer exists.");
  if (!newAsset) throw new MediaValidationError("The replacement asset no longer exists.");

  const { updatedBlocks, updatedColumns } = await replaceMediaAssetEverywhere(oldAsset.url, newAsset.url);

  const db = createServerDbClient();
  const { data: brandingUpdates, error: brandingError } = await db.rpc("replace_branding_logo_asset_atomic", {
    p_old_asset_id: oldAsset.id,
    p_new_asset_id: newAsset.id,
  });
  if (brandingError) throw brandingError;

  const { error } = await db
    .from("media_assets")
    .update({ replaced_by: newAsset.id, replaced_at: new Date().toISOString() })
    .eq("id", oldAsset.id);
  if (error) throw error;

  const updated = updatedBlocks + updatedColumns + (brandingUpdates ?? 0);
  await recordAudit("replace", "media_asset", oldAsset.id, {
    replacedWith: newAsset.id,
    updatedBlocks,
    updatedColumns,
    brandingUpdates: brandingUpdates ?? 0,
  });
  return { updated };
}
