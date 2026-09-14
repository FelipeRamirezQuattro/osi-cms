import { createServerDbClient, createServiceRoleDbClient } from "@/lib/db/client";
import type { Json, Tables } from "@/lib/db/database.types";

/**
 * Cross-cutting audit helpers (Task 5). Lives here rather than
 * lib/data/pages.ts (recordAudit's original home, added in Task 3/0017
 * but never called from TypeScript directly until this task) since every
 * lib/data/*.ts module now calls recordAudit — pages.ts is just one
 * entity among the many this now covers, and giving it its own file
 * avoids every other repository importing an "unrelated" pages module
 * for one shared cross-cutting concern.
 *
 * record_audit itself is a `security definer` SQL function (0017) that
 * re-checks is_staff() and inserts into audit_log — this is a thin RPC
 * wrapper, same shape as every other *_atomic RPC wrapper in lib/data/*.
 */
export async function recordAudit(
  action: string,
  entity: string,
  entityId?: string | null,
  diff?: Json,
): Promise<void> {
  const db = createServerDbClient();
  const { error } = await db.rpc("record_audit", {
    p_action: action,
    p_entity: entity,
    p_entity_id: entityId ?? undefined,
    p_diff: diff,
  });
  if (error) throw error;
}

export type AuditLogEntry = Tables<"audit_log"> & { actorEmail: string | null };

export type AuditLogFilters = {
  actorId?: string;
  entity?: string;
  action?: string;
  /** Inclusive, `YYYY-MM-DD` (local date from a <input type="date">). */
  dateFrom?: string;
  /** Inclusive, `YYYY-MM-DD`. */
  dateTo?: string;
  limit?: number;
};

/**
 * Lists audit_log rows (staff-only per its RLS SELECT policy — see
 * 0008_forms_ops.sql), newest first, resolving each row's actor_id to an
 * email. audit_log.actor_id references auth.users, which isn't
 * queryable through PostgREST, so — same approach as
 * lib/data/admin-users.ts::listAdminUsers — the service-role Auth admin
 * API resolves the id -> email map.
 */
export async function listAuditLog(filters: AuditLogFilters = {}): Promise<AuditLogEntry[]> {
  const db = createServerDbClient();
  let query = db
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 200);

  if (filters.actorId) query = query.eq("actor_id", filters.actorId);
  if (filters.entity) query = query.eq("entity", filters.entity);
  if (filters.action) query = query.eq("action", filters.action);
  if (filters.dateFrom) query = query.gte("created_at", `${filters.dateFrom}T00:00:00.000Z`);
  if (filters.dateTo) query = query.lte("created_at", `${filters.dateTo}T23:59:59.999Z`);

  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const service = createServiceRoleDbClient();
  const { data: usersList, error: usersError } = await service.auth.admin.listUsers();
  if (usersError) throw usersError;
  const emailById = new Map(usersList.users.map((u) => [u.id, u.email ?? null]));

  return rows.map((row) => ({ ...row, actorEmail: row.actor_id ? (emailById.get(row.actor_id) ?? null) : null }));
}

/** Every staff account that could appear as an actor — backs the actor filter <select>. */
export async function listAuditActors(): Promise<{ id: string; email: string }[]> {
  const service = createServiceRoleDbClient();
  const { data, error } = await service.auth.admin.listUsers();
  if (error) throw error;
  return data.users
    .filter((u): u is typeof u & { email: string } => !!u.email)
    .map((u) => ({ id: u.id, email: u.email }))
    .sort((a, b) => a.email.localeCompare(b.email));
}

/**
 * Distinct entity/action strings already present in audit_log — backs
 * the entity/action filter <select>s. A plain distinct-in-JS read
 * (Supabase JS has no `.distinct()`) capped well above this MVP's
 * realistic audit_log volume; revisit with a real SQL `distinct` RPC if
 * that ever stops being true.
 */
export async function listAuditFacets(): Promise<{ entities: string[]; actions: string[] }> {
  const db = createServerDbClient();
  const { data, error } = await db.from("audit_log").select("entity, action").limit(10000);
  if (error) throw error;
  const entities = new Set<string>();
  const actions = new Set<string>();
  for (const row of data ?? []) {
    entities.add(row.entity);
    actions.add(row.action);
  }
  return { entities: [...entities].sort(), actions: [...actions].sort() };
}
