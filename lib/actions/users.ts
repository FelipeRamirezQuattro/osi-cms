"use server";

import { requireAdminRole } from "@/lib/auth";
import { inviteAdminUser, listAdminUsers, updateAdminUserRow, type AdminUserRow } from "@/lib/data/admin-users";

export async function listAdminUsersAction(): Promise<AdminUserRow[]> {
  await requireAdminRole();
  return listAdminUsers();
}

export type InviteUserResult = { status: "success" } | { status: "error"; message: string };

export async function inviteUserAction(email: string, role: "admin" | "editor", fullName?: string): Promise<InviteUserResult> {
  await requireAdminRole();
  try {
    await inviteAdminUser(email, role, fullName);
    return { status: "success" };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Invite failed." };
  }
}

export async function setUserActiveAction(userId: string, isActive: boolean): Promise<void> {
  await requireAdminRole();
  await updateAdminUserRow(userId, { is_active: isActive });
}

export async function setUserRoleAction(userId: string, role: "admin" | "editor"): Promise<void> {
  await requireAdminRole();
  await updateAdminUserRow(userId, { role });
}
