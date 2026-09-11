import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/pages", label: "Pages" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/news", label: "News" },
  { href: "/admin/industries", label: "Industries" },
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/resources", label: "Resources" },
  { href: "/admin/locations", label: "Locations" },
  { href: "/admin/directory", label: "Directory" },
  { href: "/admin/navigation", label: "Navigation" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/submissions", label: "Submissions" },
  { href: "/admin/redirects", label: "Redirects" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/users", label: "Users" },
];

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  return (
    <div className="flex min-h-screen bg-osi-cream-100 text-osi-navy-900">
      <aside className="flex w-56 shrink-0 flex-col bg-osi-navy-900 px-4 py-6 text-osi-white">
        <Link href="/admin" className="mb-8 px-2 font-display text-lg tracking-wide-display uppercase">
          OSI Admin
        </Link>
        <nav className="flex-1 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
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
