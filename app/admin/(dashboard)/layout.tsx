import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { ADMIN_NAV_GROUPS, filterNavGroupsByRole } from "@/lib/admin/nav-config";
import { logoutAction } from "@/lib/actions/auth";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  const groups = filterNavGroupsByRole(ADMIN_NAV_GROUPS, session.role);

  return (
    <AdminShell
      groups={groups}
      session={{ email: session.email, role: session.role }}
      signOut={
        <form action={logoutAction}>
          <button type="submit" className="mt-2 text-osi-gold-500 hover:underline">
            Sign out
          </button>
        </form>
      }
    >
      {children}
    </AdminShell>
  );
}
