"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inviteUserAction, setUserActiveAction, setUserRoleAction } from "@/lib/actions/users";
import type { AdminUserRow } from "@/lib/data/admin-users";

export function UsersAdmin({ users }: { users: AdminUserRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"admin" | "editor">("editor");
  const [error, setError] = useState<string | null>(null);

  function invite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await inviteUserAction(email, role, fullName || undefined);
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setEmail("");
      setFullName("");
      router.refresh();
    });
  }

  function toggleActive(user: AdminUserRow) {
    startTransition(async () => {
      await setUserActiveAction(user.user_id, !user.is_active);
      router.refresh();
    });
  }

  function changeRole(user: AdminUserRow, newRole: "admin" | "editor") {
    startTransition(async () => {
      await setUserRoleAction(user.user_id, newRole);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-lg tracking-wide-display uppercase">Users</h1>

      <form onSubmit={invite} className="flex flex-wrap items-end gap-3 rounded border border-osi-sand-300 bg-osi-white p-4">
        <label className="space-y-1 text-sm">
          <span className="block text-xs uppercase tracking-wide-label opacity-70">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded border border-osi-sand-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="block text-xs uppercase tracking-wide-label opacity-70">Full name</span>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="rounded border border-osi-sand-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="block text-xs uppercase tracking-wide-label opacity-70">Role</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "editor")}
            className="rounded border border-osi-sand-300 px-3 py-2 text-sm"
          >
            <option value="editor">editor</option>
            <option value="admin">admin</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-osi-navy-900 px-4 py-2 text-xs uppercase tracking-wide-label text-osi-white disabled:opacity-50"
        >
          Invite
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </form>

      <div className="overflow-hidden rounded border border-osi-sand-300 bg-osi-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-osi-cream-100 text-xs uppercase tracking-wide-label opacity-70">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.user_id} className="border-t border-osi-sand-300">
                <td className="px-4 py-2">{user.full_name ?? "—"}</td>
                <td className="px-4 py-2 opacity-70">{user.email}</td>
                <td className="px-4 py-2">
                  <select
                    value={user.role}
                    onChange={(e) => changeRole(user, e.target.value as "admin" | "editor")}
                    disabled={isPending}
                    className="rounded border border-osi-sand-300 px-2 py-1 text-xs"
                  >
                    <option value="editor">editor</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td className="px-4 py-2">
                  <span
                    className={
                      user.is_active
                        ? "rounded bg-green-100 px-2 py-0.5 text-xs text-green-800"
                        : "rounded bg-osi-sand-300/50 px-2 py-0.5 text-xs opacity-70"
                    }
                  >
                    {user.is_active ? "active" : "disabled"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => toggleActive(user)}
                    disabled={isPending}
                    className="text-xs hover:underline"
                  >
                    {user.is_active ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
