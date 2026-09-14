"use server";

import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/auth";
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

export type SaveEntityResult = { status: "success"; id: string } | { status: "error"; message: string };

export async function saveEntityAction(
  entity: EntityKey,
  id: string | null,
  values: Record<string, unknown>,
): Promise<SaveEntityResult> {
  await requireCapability("edit_drafts");
  const config = ENTITY_CONFIGS[entity];
  const payload = coerceValues(entity, values);

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
    return { status: "error", message: err instanceof Error ? err.message : "Save failed." };
  }
}

export async function deleteEntityAction(entity: EntityKey, id: string): Promise<void> {
  await requireCapability("delete_content");
  await deleteEntityRow(ENTITY_CONFIGS[entity].table, id);
  redirect(`/admin/${entity}`);
}

export async function moveEntityAction(entity: EntityKey, id: string, direction: "up" | "down"): Promise<void> {
  await requireCapability("edit_drafts");
  await moveEntityRow(ENTITY_CONFIGS[entity].table, id, direction);
}
