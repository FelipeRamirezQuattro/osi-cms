"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { AdminNavGroup } from "@/lib/admin/nav-config";

/**
 * The admin chrome (Task 13a): a fixed sidebar on desktop, a slide-in
 * drawer behind a hamburger button below the `lg` breakpoint, a visibly
 * highlighted active section, and a breadcrumb trail above the page
 * content. Pulled into a Client Component because active-section
 * highlighting and the drawer's open/closed state both need
 * `usePathname()`/`useState` — the layout itself stays a Server Component
 * (it does the `requireAdmin()` + capability filtering), passing the
 * already-filtered `groups` down as plain serializable data.
 */
export function AdminShell({
  groups,
  session,
  signOut,
  children,
}: {
  groups: AdminNavGroup[];
  session: { email: string; role: string };
  signOut: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // A route change (following any nav link) always closes the mobile
  // drawer. Adjusting state during render (React's documented pattern for
  // "reset state when a prop changes") rather than an effect — an effect
  // here would set state synchronously on mount of every navigation,
  // which is exactly the cascading-render pattern React's own lint rule
  // flags; tracking the previous pathname and branching during render
  // needs no effect at all.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setDrawerOpen(false);
  }

  const breadcrumbs = buildBreadcrumbs(pathname, groups);

  return (
    <div className="flex min-h-screen flex-col bg-osi-cream-100 text-osi-navy-900 lg:flex-row">
      {/* Mobile top bar */}
      <div className="flex items-center justify-between bg-osi-navy-900 px-4 py-3 text-osi-white lg:hidden">
        <Link href="/admin" className="font-display text-base tracking-wide-display uppercase">
          OSI Admin
        </Link>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="rounded p-1.5 hover:bg-osi-navy-700"
        >
          <MenuIcon />
        </button>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-osi-navy-900/60"
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto bg-osi-navy-900 px-4 py-6 text-osi-white">
            <div className="mb-6 flex items-center justify-between">
              <span className="font-display text-lg tracking-wide-display uppercase">OSI Admin</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="rounded p-1.5 hover:bg-osi-navy-700"
              >
                <CloseIcon />
              </button>
            </div>
            <SidebarNav groups={groups} pathname={pathname} />
            <SidebarFooter session={session} signOut={signOut} />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col bg-osi-navy-900 px-4 py-6 text-osi-white lg:flex">
        <Link href="/admin" className="mb-8 px-2 font-display text-lg tracking-wide-display uppercase">
          OSI Admin
        </Link>
        <SidebarNav groups={groups} pathname={pathname} />
        <SidebarFooter session={session} signOut={signOut} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {breadcrumbs.length > 1 && (
          <nav aria-label="Breadcrumb" className="border-b border-osi-sand-300 bg-osi-white px-6 py-2 text-xs opacity-70 lg:px-8">
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.href}>
                {index > 0 && <span className="px-1.5">/</span>}
                {index === breadcrumbs.length - 1 ? (
                  <span className="opacity-100">{crumb.label}</span>
                ) : (
                  <Link href={crumb.href} className="hover:underline">
                    {crumb.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>
        )}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function SidebarNav({ groups, pathname }: { groups: AdminNavGroup[]; pathname: string }) {
  return (
    <nav className="flex-1 space-y-4 overflow-y-auto">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-1 px-2 text-[10px] uppercase tracking-wide-label opacity-50">{group.label}</p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const isActive = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`block rounded px-2 py-1.5 text-sm ${
                    isActive
                      ? "bg-osi-gold-500 font-medium text-osi-navy-900"
                      : "opacity-90 hover:bg-osi-navy-700 hover:opacity-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter({ session, signOut }: { session: { email: string; role: string }; signOut: ReactNode }) {
  return (
    <div className="border-t border-osi-steel-500/20 pt-4 text-xs">
      <p className="truncate opacity-70">{session.email}</p>
      <p className="opacity-50 uppercase">{session.role}</p>
      {signOut}
    </div>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

type Crumb = { label: string; href: string };

/**
 * Turns `/admin/pages/<id>` into Admin / Pages / Edit, `/admin/pages/new`
 * into Admin / Pages / New, and `/admin` alone into just `[Admin]` (the
 * caller skips rendering the bar entirely for a length-1 trail — the
 * dashboard doesn't need to tell you you're on the dashboard). The nav
 * config supplies the section label for the second segment; a deeper
 * detail segment (an id, or "new") gets a generic label since a
 * breadcrumb has no way to know a row's real title without a data fetch,
 * and every editor screen underneath already shows that in its own
 * heading.
 */
function buildBreadcrumbs(pathname: string, groups: AdminNavGroup[]): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [{ label: "Admin", href: "/admin" }];
  if (segments.length <= 1) return crumbs;

  const sectionHref = `/${segments[0]}/${segments[1]}`;
  const navItem = groups.flatMap((g) => g.items).find((item) => item.href === sectionHref);
  if (navItem) crumbs.push({ label: navItem.label, href: navItem.href });

  if (segments.length > 2) {
    const last = segments[segments.length - 1];
    crumbs.push({ label: last === "new" ? "New" : "Edit", href: pathname });
  }

  return crumbs;
}

export { buildBreadcrumbs };
