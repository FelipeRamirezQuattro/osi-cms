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
 * Counts active admins other than `excludeUserId` — the "how many admins
 * are left if this row's change goes through" query that
 * assertDoesNotOrphanAdmins guards every role/active-status change with.
 * Kept here (not a separate helper module) since this is the one place
 * that needs it.
 */
async function countOtherActiveAdmins(excludeUserId: string): Promise<number> {
  const db = createServerDbClient();
  const { count, error } = await db
    .from("admin_profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("is_active", true)
    .neq("user_id", excludeUserId);
  if (error) throw error;
  return count ?? 0;
}

/**
 * The single last-admin enforcement point, shared by every caller that
 * can change a profile's role/active state: updateAdminUserRow (the
 * ordinary edit path) AND inviteAdminUser (whose upsert silently
 * re-roles/reactivates an *existing* account when the invited email
 * already has a profile — a real second path to the same outcome that
 * had zero protection before this fix, e.g. an admin re-inviting their
 * own email as "editor"). `current: null` means "no existing profile"
 * (a genuinely new invite), which can never be an active admin already,
 * so the guard passes trivially — only an existing active-admin row
 * that would stop being one triggers the count query.
 */
async function assertDoesNotOrphanAdmins(
  userId: string,
  // `role` is typed as plain `string` here (not the "admin" | "editor"
  // union) because it comes straight off a `.select("role, is_active")`
  // read — the generated admin_profiles.role column type is `string`,
  // not a literal union, even though the DB's check constraint only
  // ever allows those two values.
  current: { role: string; is_active: boolean } | null,
  proposedRole: string,
  proposedIsActive: boolean,
): Promise<void> {
  const wasActiveAdmin = current?.role === "admin" && current.is_active === true;
  const willBeActiveAdmin = proposedRole === "admin" && proposedIsActive;
  if (!wasActiveAdmin || willBeActiveAdmin) return;

  const remaining = await countOtherActiveAdmins(userId);
  if (remaining === 0) {
    throw new Error("Can't do that — this is the last active admin. Promote or activate another admin first.");
  }
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
  // requireCapability("manage_users"), this is defense in depth, not
  // the only gate.
  const db = createServerDbClient();

  // The upsert below can re-role/reactivate an *existing* profile (the
  // "already invited this email before" branch above) — run it through
  // the same last-admin guard updateAdminUserRow uses, keyed off
  // whatever profile currently exists for this user_id (none, for a
  // genuinely new invite).
  const { data: current, error: currentError } = await db
    .from("admin_profiles")
    .select("role, is_active")
    .eq("user_id", userId)
    .maybeSingle();
  if (currentError) throw currentError;
  await assertDoesNotOrphanAdmins(userId, current, role, true);

  const { error: upsertError } = await db
    .from("admin_profiles")
    .upsert({ user_id: userId, role, full_name: fullName ?? null, is_active: true }, { onConflict: "user_id" });
  if (upsertError) throw upsertError;
}

/**
 * Updates an admin_profiles row's role/active status, refusing a change
 * that would leave zero active admins (deactivating the last admin, or
 * demoting the last admin to editor) — nothing enforced this before,
 * so an admin could accidentally lock every admin out of /admin/users
 * with no way back in short of a direct DB edit. Defense-in-depth lives
 * here in the data layer (not just the Server Action) since this is the
 * one function every ordinary admin-mutating caller goes through — see
 * assertDoesNotOrphanAdmins above for the other path (inviteAdminUser's
 * re-role upsert) that shares this same guard.
 */
export async function updateAdminUserRow(
  userId: string,
  values: { role?: "admin" | "editor"; is_active?: boolean },
): Promise<void> {
  const db = createServerDbClient();

  const { data: current, error: currentError } = await db
    .from("admin_profiles")
    .select("role, is_active")
    .eq("user_id", userId)
    .maybeSingle();
  if (currentError) throw currentError;
  if (!current) throw new Error("User not found.");

  const proposedRole = values.role ?? current.role;
  const proposedIsActive = values.is_active ?? current.is_active;
  await assertDoesNotOrphanAdmins(userId, current, proposedRole, proposedIsActive);

  const { error } = await db.from("admin_profiles").update(values).eq("user_id", userId);
  if (error) throw error;
}
