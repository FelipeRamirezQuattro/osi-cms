"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inviteUserAction, setUserActiveAction, setUserRoleAction } from "@/lib/actions/users";
import type { AdminUserRow } from "@/lib/data/admin-users";
import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/ui/admin-data-table";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { RowActionButton } from "@/components/admin/ui/row-actions";

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

  const columns: AdminDataTableColumn<AdminUserRow>[] = [
    { key: "name", header: "Name", render: (user) => user.full_name ?? "—" },
    { key: "email", header: "Email", cellClassName: "opacity-70", render: (user) => user.email },
    {
      key: "role",
      header: "Role",
      render: (user) => (
        <select
          value={user.role}
          onChange={(e) => changeRole(user, e.target.value as "admin" | "editor")}
          disabled={isPending}
          className="rounded border border-osi-sand-300 px-2 py-1 text-xs"
        >
          <option value="editor">editor</option>
          <option value="admin">admin</option>
        </select>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (user) => <StatusBadge label={user.is_active ? "active" : "disabled"} />,
    },
    {
      key: "actions",
      header: "",
      cellClassName: "text-right",
      render: (user) => (
        <RowActionButton onClick={() => toggleActive(user)} disabled={isPending}>
          {user.is_active ? "Disable" : "Enable"}
        </RowActionButton>
      ),
    },
  ];

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

      <AdminDataTable columns={columns} rows={users} getRowKey={(user) => user.user_id} />
    </div>
  );
}
