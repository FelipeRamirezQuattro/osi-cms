import { createServerDbClient, createServiceRoleDbClient } from "@/lib/db/client";
import type { Tables } from "@/lib/db/database.types";

export type AdminUserRow = Tables<"admin_profiles"> & { email: string };

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  const db = createServerDbClient();
  const { data: profiles, error } = await db
    .from("admin_profiles")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;

  // auth.users isn't queryable through PostgREST — the admin API (service
  // role only) is the only way to resolve user_id -> email.
  const service = createServiceRoleDbClient();
  const { data: usersList, error: usersError } = await service.auth.admin.listUsers();
  if (usersError) throw usersError;
  const emailById = new Map(usersList.users.map((u) => [u.id, u.email ?? ""]));

  return (profiles ?? []).map((p) => ({ ...p, email: emailById.get(p.user_id) ?? "(unknown)" }));
}

/**
 * Invites a new admin/editor by email (no password set here — they get a
 * Supabase Auth email to set one), or re-activates/re-roles an existing
 * account. Mirrors scripts/create-admin-user.ts's bootstrap logic exactly.
 */
export async function inviteAdminUser(email: string, role: "admin" | "editor", fullName?: string): Promise<void> {
  const service = createServiceRoleDbClient();
  const { data, error } = await service.auth.admin.inviteUserByEmail(email);

  let userId: string;
  if (error) {
    if (!error.message.toLowerCase().includes("already")) throw error;
    const { data: list, error: listError } = await service.auth.admin.listUsers();
    if (listError) throw listError;
    const existing = list.users.find((u) => u.email === email);
    if (!existing) throw error;
    userId = existing.id;
  } else {
    userId = data.user.id;
  }

  // Uses the caller's cookie-authenticated client (not service role) so
  // this still goes through admin_profiles' own RLS (is_admin()-only
  // insert/update) — the calling Server Action already checked
  // requireAdminRole(), this is defense in depth, not the only gate.
  const db = createServerDbClient();
  const { error: upsertError } = await db
    .from("admin_profiles")
    .upsert({ user_id: userId, role, full_name: fullName ?? null, is_active: true }, { onConflict: "user_id" });
  if (upsertError) throw upsertError;
}

export async function updateAdminUserRow(
  userId: string,
  values: { role?: "admin" | "editor"; is_active?: boolean },
): Promise<void> {
  const db = createServerDbClient();
  const { error } = await db.from("admin_profiles").update(values).eq("user_id", userId);
  if (error) throw error;
}
