"use server";

import { redirect } from "next/navigation";
import { requireCapability, requirePublishCapabilityForStatusChange } from "@/lib/auth";
import { ENTITY_CONFIGS, type EntityKey } from "@/lib/admin/entity-config";
import {
  deleteEntityRow,
  getEntityRow,
  insertEntityRow,
  listEntityRows,
  listRelationOptions,
  moveEntityRow,
  updateEntityRow,
  type EntityRow,
} from "@/lib/data/admin-entities";
import type { RelationOptionsMap } from "@/components/admin/relation-options";
import { formatZodError, isUniqueViolationError } from "@/lib/validation/common";
import { validateEntityInput } from "@/lib/validation/entities";
import { findRedirectChainIssue, type RedirectEdge } from "@/lib/validation/redirects";
import { countProductsByCategory } from "@/lib/data/products";

export async function listEntitiesAction(entity: EntityKey): Promise<EntityRow[]> {
  await requireCapability("edit_drafts");
  const config = ENTITY_CONFIGS[entity];
  const orderBy = config.hasPosition
    ? [{ column: "position", ascending: true }]
    : [{ column: "created_at", ascending: false }];
  return listEntityRows(config.table, orderBy);
}

export async function getEntityAction(entity: EntityKey, id: string): Promise<EntityRow | null> {
  await requireCapability("edit_drafts");
  return getEntityRow(ENTITY_CONFIGS[entity].table, id);
}

export async function getRelationOptionsAction(entity: EntityKey): Promise<RelationOptionsMap> {
  await requireCapability("edit_drafts");
  const config = ENTITY_CONFIGS[entity];
  if (!config.relations) return {};
  const entries = await Promise.all(
    config.relations.map(
      async (r) => [r.key, await listRelationOptions(r.table, r.valueColumn, r.labelColumn)] as const,
    ),
  );
  return Object.fromEntries(entries);
}

/** Coerces raw form-control strings back to the column type each field describes. */
function coerceValues(entity: EntityKey, values: Record<string, unknown>): Record<string, unknown> {
  const config = ENTITY_CONFIGS[entity];
  const out: Record<string, unknown> = {};
  for (const field of config.fields) {
    let value = values[field.key];
    if (field.type === "number") value = value === "" || value === undefined || value === null ? null : Number(value);
    else if (field.type === "date") value = value || null;
    else if (field.type === "relation") value = value || null;
    else if ((field.type === "text" || field.type === "textarea") && field.optional) value = value || null;
    out[field.key] = value;
  }
  // The only column stored as an int but edited as a <select> of strings.
  if (entity === "redirects" && "status_code" in out) out.status_code = Number(out.status_code);
  return out;
}

export type SaveEntityResult =
  | { status: "success"; id: string }
  | { status: "error"; message: string; field?: string };

export async function saveEntityAction(
  entity: EntityKey,
  id: string | null,
  values: Record<string, unknown>,
): Promise<SaveEntityResult> {
  await requireCapability("edit_drafts");
  const config = ENTITY_CONFIGS[entity];
  const coerced = coerceValues(entity, values);

  const parsed = validateEntityInput(entity, coerced);
  if (!parsed.success) {
    const { message, field } = formatZodError(parsed.error);
    return { status: "error", message, field };
  }
  const payload: Record<string, unknown> = { ...parsed.data };

  // Task 15: redirect loop/chain rejection, special-cased to the
  // `redirects` entity — the self-loop case is already caught by
  // redirectSchema's own refine above; this needs every *other* existing
  // redirect row, which only the data layer (not a synchronous Zod
  // schema) can provide. Walks the chain at save time rather than
  // relying solely on the DB (which can only ever see the one-step
  // self-loop case via redirects_no_self_loop_check, migration 0030).
  if (entity === "redirects") {
    const existingRows = await listEntityRows("redirects", [{ column: "from_path" }]);
    const existingEdges: RedirectEdge[] = existingRows.map((row) => ({
      id: row.id,
      from_path: String(row.from_path),
      to_path: String(row.to_path),
    }));
    const issue = findRedirectChainIssue(
      { id: id ?? undefined, from_path: payload.from_path as string, to_path: payload.to_path as string },
      existingEdges,
    );
    if (issue) return { status: "error", message: issue, field: "to_path" };
  }

  // Same reasoning as saveProductAction: edit_drafts covers ordinary
  // create/edit, but flipping `status` to/from "published" needs the
  // publish capability too. Only entities with a status field at all
  // (config.hasStatus) can even attempt that transition. Read/guard
  // before the try/catch below — a redirect() thrown inside that catch
  // would be swallowed instead of actually redirecting.
  if (config.hasStatus) {
    const current = id ? await getEntityRow(config.table, id) : null;
    await requirePublishCapabilityForStatusChange(
      (current?.status as string | null | undefined) ?? null,
      payload.status as string | null | undefined,
    );
  }

  try {
    if (id) {
      const row = await updateEntityRow(config.table, id, payload);
      return { status: "success", id: row.id as string };
    }
    if (config.hasPosition) {
      const rows = await listEntityRows(config.table, [{ column: "position", ascending: false }]);
      payload.position = rows.length > 0 ? Number(rows[0].position ?? 0) + 1 : 0;
    }
    const row = await insertEntityRow(config.table, payload);
    return { status: "success", id: row.id as string };
  } catch (err) {
    if (isUniqueViolationError(err)) {
      return { status: "error", message: "That slug or name is already in use — choose a different one." };
    }
    return { status: "error", message: err instanceof Error ? err.message : "Save failed." };
  }
}

export type DeleteEntityResult = { status: "success" } | { status: "error"; message: string };

export async function deleteEntityAction(entity: EntityKey, id: string): Promise<DeleteEntityResult | void> {
  await requireCapability("delete_content");

  // Change-impact guard: category_id is nullable with `on delete set
  // null` at the DB level (migration 0003), which would silently orphan
  // a product's canonical URL (productHref needs a category slug)
  // instead of rejecting the delete — this is an app-level pre-write
  // check, same pattern as the last-admin guard in lib/data/admin-users.ts,
  // not a DB constraint.
  if (entity === "product-categories") {
    const count = await countProductsByCategory(id);
    if (count > 0) {
      return {
        status: "error",
        message: `Can't delete — ${count} product${count === 1 ? "" : "s"} use${count === 1 ? "s" : ""} this category.`,
      };
    }
  }

  try {
    await deleteEntityRow(ENTITY_CONFIGS[entity].table, id);
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Delete failed." };
  }

  // Called outside the try/catch above — redirect() throws internally,
  // and catching it here would misreport a successful delete as a
  // failure (same reasoning as requirePublishCapabilityForStatusChange's
  // call sites in lib/auth/index.ts).
  redirect(`/admin/${entity}`);
}

export async function moveEntityAction(entity: EntityKey, id: string, direction: "up" | "down"): Promise<void> {
  await requireCapability("edit_drafts");
  await moveEntityRow(ENTITY_CONFIGS[entity].table, id, direction);
}

export type ArchiveEntityResult = { status: "success" } | { status: "error"; message: string };

/**
 * Task 15 archive/restore — scoped to entities with `allowArchive: true`
 * (news, resources; see lib/admin/entity-config.ts). Unlike pages, these
 * tables' UPDATE RLS policy is still the original "staff manage <table>"
 * `for all using (is_staff())` grant (never locked down the way pages
 * was in migration 0017), so a plain updateEntityRow call already
 * succeeds for any staff session — no new RPC needed here. The
 * publish-capability gate still applies the same way saveEntityAction's
 * own status-field edits do: archiving a *published* row needs
 * `publish` (see requirePublishCapabilityForStatusChange), archiving a
 * draft is plain `edit_drafts` work, and restoring only ever lands back
 * in 'draft'.
 */
export async function archiveEntityAction(entity: EntityKey, id: string): Promise<ArchiveEntityResult> {
  await requireCapability("edit_drafts");
  const config = ENTITY_CONFIGS[entity];
  if (!config.allowArchive) return { status: "error", message: `${config.label} can't be archived.` };

  const current = await getEntityRow(config.table, id);
  await requirePublishCapabilityForStatusChange((current?.status as string | null | undefined) ?? null, "archived");

  try {
    await updateEntityRow(config.table, id, { status: "archived" });
    return { status: "success" };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Archive failed." };
  }
}

export async function restoreEntityAction(entity: EntityKey, id: string): Promise<ArchiveEntityResult> {
  await requireCapability("edit_drafts");
  const config = ENTITY_CONFIGS[entity];
  if (!config.allowArchive) return { status: "error", message: `${config.label} can't be restored.` };

  // Restore is only ever valid from 'archived' — without this check,
  // calling this action directly on a published row would flip it to
  // 'draft' (un-publishing it) with only edit_drafts, bypassing the
  // `publish` capability requirePublishCapabilityForStatusChange
  // normally requires for any published<->other transition.
  const current = await getEntityRow(config.table, id);
  if (current?.status !== "archived") {
    return { status: "error", message: `${config.label} is not archived.` };
  }

  try {
    await updateEntityRow(config.table, id, { status: "draft" });
    return { status: "success" };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Restore failed." };
  }
}
