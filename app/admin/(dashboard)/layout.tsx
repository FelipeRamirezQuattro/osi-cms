import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { hasCapability, type Capability } from "@/lib/auth/capabilities";
import { logoutAction } from "@/lib/actions/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

// `capability: null` means "every active staff session sees this" (the
// dashboard landing page itself) — everything else is gated by the same
// capability its Server Action(s) require, so an editor never sees a
// link to a section every action behind it would redirect them out of.
const NAV_ITEMS: { href: string; label: string; capability: Capability | null }[] = [
  { href: "/admin", label: "Dashboard", capability: null },
  { href: "/admin/pages", label: "Pages", capability: "edit_drafts" },
  { href: "/admin/shared-sections", label: "Shared sections", capability: "edit_drafts" },
  { href: "/admin/forms", label: "Forms", capability: "edit_drafts" },
  { href: "/admin/products", label: "Products", capability: "edit_drafts" },
  { href: "/admin/product-categories", label: "Product categories", capability: "edit_drafts" },
  { href: "/admin/news", label: "News", capability: "edit_drafts" },
  { href: "/admin/industries", label: "Industries", capability: "edit_drafts" },
  { href: "/admin/applications", label: "Applications", capability: "edit_drafts" },
  { href: "/admin/resources", label: "Resources", capability: "edit_drafts" },
  { href: "/admin/locations", label: "Locations", capability: "edit_drafts" },
  { href: "/admin/directory", label: "Directory", capability: "edit_drafts" },
  { href: "/admin/navigation", label: "Navigation", capability: "manage_navigation" },
  { href: "/admin/media", label: "Media", capability: "upload_media" },
  { href: "/admin/submissions", label: "Submissions", capability: "view_submissions" },
  { href: "/admin/redirects", label: "Redirects", capability: "edit_drafts" },
  { href: "/admin/settings", label: "Settings", capability: "manage_settings" },
  { href: "/admin/users", label: "Users", capability: "manage_users" },
  { href: "/admin/audit-log", label: "Audit log", capability: "view_audit" },
];

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  const visibleNavItems = NAV_ITEMS.filter(
    (item) => item.capability === null || hasCapability(session.role, item.capability),
  );

  return (
    <div className="flex min-h-screen bg-osi-cream-100 text-osi-navy-900">
      <aside className="flex w-56 shrink-0 flex-col bg-osi-navy-900 px-4 py-6 text-osi-white">
        <Link href="/admin" className="mb-8 px-2 font-display text-lg tracking-wide-display uppercase">
          OSI Admin
        </Link>
        <nav className="flex-1 space-y-0.5 overflow-y-auto">
          {visibleNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded px-2 py-1.5 text-sm opacity-90 hover:bg-osi-navy-700 hover:opacity-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-osi-steel-500/20 pt-4 text-xs">
          <p className="truncate opacity-70">{session.email}</p>
          <p className="opacity-50 uppercase">{session.role}</p>
          <form action={logoutAction}>
            <button type="submit" className="mt-2 text-osi-gold-500 hover:underline">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
