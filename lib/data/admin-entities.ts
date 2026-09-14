import { createServerDbClient } from "@/lib/db/client";
import { recordAudit } from "@/lib/data/audit";

/**
 * Generic CRUD glue for the simple-entity admin (see
 * lib/admin/entity-config.ts) — the ~8 content tables that are just flat
 * columns with a `position`/`status`, reused across one list + one edit
 * screen instead of hand-writing near-identical repositories per entity.
 * `table` is a runtime string (not a Database key), so this necessarily
 * loses some type precision — confined to this one file, same reasoning
 * as the `any` usage documented in CLAUDE.md's admin-forms section.
 *
 * Every mutation here is already a single-statement write (one `insert`/
 * `update`/`delete` call), so per Task 5's ruling it gets a direct
 * recordAudit() call right after the write succeeds rather than a new
 * atomic RPC — there's no multi-statement sequence here to wrap.
 * moveEntityRow is the one exception: it reads the current ordering,
 * then needs *two* row updates to swap a position, which is exactly the
 * non-atomic pattern Task 5 targets — it now goes through the
 * swap_entity_position RPC (0022_product_and_reorder_atomic.sql), which
 * does both updates and the audit write in one transaction.
 */

export type EntityRow = Record<string, unknown> & { id: string };

/** A short human-readable label for an audit diff — never the full row (may contain long body text). */
function auditLabel(values: Record<string, unknown>): string | undefined {
  const label = values.name ?? values.title ?? values.label ?? values.slug ?? values.from_path;
  return typeof label === "string" ? label : undefined;
}

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
  const row = data as EntityRow;
  await recordAudit("create", table, row.id, { label: auditLabel(values) });
  return row;
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
  await recordAudit("update", table, id, { label: auditLabel(values), changedFields: Object.keys(values) });
  return data as EntityRow;
}

export async function deleteEntityRow(table: string, id: string): Promise<void> {
  const db = createServerDbClient();
  const existing = await getEntityRow(table, id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db.from(table as any) as any).delete().eq("id", id);
  if (error) throw error;
  await recordAudit("delete", table, id, { label: existing ? auditLabel(existing) : undefined });
}

/**
 * Swaps `position` with the immediate neighbor — the list view's up/down
 * reorder controls. The read here (finding the neighbor's id) is
 * necessarily a separate step, but the actual swap is one call into
 * swap_entity_position (0022_product_and_reorder_atomic.sql), which does
 * both updates and the audit write inside a single transaction — the
 * previous version of this function did two sequential updateEntityRow
 * calls with no transaction between them.
 */
export async function moveEntityRow(table: string, id: string, direction: "up" | "down"): Promise<void> {
  const rows = await listEntityRows(table, [{ column: "position", ascending: true }]);
  const index = rows.findIndex((r) => r.id === id);
  if (index === -1) return;
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= rows.length) return;

  const a = rows[index];
  const b = rows[swapIndex];
  const db = createServerDbClient();
  const { error } = await db.rpc("swap_entity_position", { p_table: table, p_id_a: a.id, p_id_b: b.id });
  if (error) throw error;
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
