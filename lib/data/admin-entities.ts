import { createServerDbClient } from "@/lib/db/client";

/**
 * Generic CRUD glue for the simple-entity admin (see
 * lib/admin/entity-config.ts) — the ~8 content tables that are just flat
 * columns with a `position`/`status`, reused across one list + one edit
 * screen instead of hand-writing near-identical repositories per entity.
 * `table` is a runtime string (not a Database key), so this necessarily
 * loses some type precision — confined to this one file, same reasoning
 * as the `any` usage documented in CLAUDE.md's admin-forms section.
 */

export type EntityRow = Record<string, unknown> & { id: string };

export async function listEntityRows(
  table: string,
  orderBy: { column: string; ascending?: boolean }[],
): Promise<EntityRow[]> {
  const db = createServerDbClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (db.from(table as any).select("*") as any);
  for (const o of orderBy) query = query.order(o.column, { ascending: o.ascending ?? true });
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as EntityRow[];
}

export async function getEntityRow(table: string, id: string): Promise<EntityRow | null> {
  const db = createServerDbClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db.from(table as any) as any).select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as EntityRow | null;
}

export async function insertEntityRow(table: string, values: Record<string, unknown>): Promise<EntityRow> {
  const db = createServerDbClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db.from(table as any) as any).insert(values).select("*").single();
  if (error) throw error;
  return data as EntityRow;
}

export async function updateEntityRow(
  table: string,
  id: string,
  values: Record<string, unknown>,
): Promise<EntityRow> {
  const db = createServerDbClient();
  const { data, error } = await (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db.from(table as any) as any
  )
    .update(values)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as EntityRow;
}

export async function deleteEntityRow(table: string, id: string): Promise<void> {
  const db = createServerDbClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db.from(table as any) as any).delete().eq("id", id);
  if (error) throw error;
}

/** Swaps `position` with the immediate neighbor — the list view's up/down reorder controls. */
export async function moveEntityRow(table: string, id: string, direction: "up" | "down"): Promise<void> {
  const rows = await listEntityRows(table, [{ column: "position", ascending: true }]);
  const index = rows.findIndex((r) => r.id === id);
  if (index === -1) return;
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= rows.length) return;

  const a = rows[index];
  const b = rows[swapIndex];
  await updateEntityRow(table, a.id, { position: b.position });
  await updateEntityRow(table, b.id, { position: a.position });
}

export async function listRelationOptions(
  table: string,
  valueColumn: string,
  labelColumn: string,
): Promise<{ value: string; label: string }[]> {
  const db = createServerDbClient();
  const { data, error } = await (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db.from(table as any) as any
  )
    .select(`${valueColumn}, ${labelColumn}`)
    .order(labelColumn, { ascending: true });
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({ value: String(row[valueColumn]), label: String(row[labelColumn]) }));
}
