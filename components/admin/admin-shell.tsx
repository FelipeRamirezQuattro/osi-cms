"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { AdminNavGroup } from "@/lib/admin/nav-config";
import { AdminNavIcon } from "@/components/admin/ui/admin-nav-icon";
import { IconButton } from "@/components/admin/ui/icon-button";
import { ToastProvider } from "@/components/admin/ui/toast";

const SIDEBAR_STORAGE_KEY = "osi-admin-sidebar-collapsed";
const SIDEBAR_EVENT = "osi-admin-sidebar-preference";

function subscribeSidebarPreference(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(SIDEBAR_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SIDEBAR_EVENT, callback);
  };
}

function getSidebarPreference() {
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
}

function getServerSidebarPreference() {
  return false;
}

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
  const drawerRef = useRef<HTMLDialogElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const sidebarCollapsed = useSyncExternalStore(
    subscribeSidebarPreference,
    getSidebarPreference,
    getServerSidebarPreference,
  );

  // A route change (following any nav link) always closes the mobile
  // drawer. This is an imperative call on the native <dialog> itself
  // (close(), not setState), so it's fine inside a plain effect — it
  // isn't the setState-during-effect cascading-render pattern React's
  // lint rule flags, and close() on an already-closed dialog is a no-op
  // (no "close" event fires), so this is harmless on first mount too.
  useEffect(() => {
    drawerRef.current?.close();
  }, [pathname]);

  // The drawer's `<dialog>` stays modal (top layer, rest of the document
  // marked inert) purely because of `showModal()` — that state has
  // nothing to do with `lg:hidden` making it invisible above the `lg`
  // (1024px) breakpoint. Without this, rotating a tablet from portrait
  // (768px) to landscape (≥1024px) while the drawer is open leaves the
  // whole admin invisible-but-inert: the desktop sidebar renders
  // underneath, but every click is swallowed by the still-modal dialog.
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    function handleChange(event: MediaQueryListEvent) {
      if (event.matches) drawerRef.current?.close();
    }
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  function openDrawer() {
    drawerRef.current?.showModal();
    setDrawerOpen(true);
  }

  function closeDrawer() {
    drawerRef.current?.close();
  }

  function toggleSidebar() {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(!sidebarCollapsed));
    window.dispatchEvent(new Event(SIDEBAR_EVENT));
  }

  const breadcrumbs = buildBreadcrumbs(pathname, groups);
  const activeItem = groups
    .flatMap((group) => group.items)
    .find((item) =>
      item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href),
    );

  return (
    <ToastProvider>
      <div className="admin-shell flex flex-col lg:flex-row">
        {/*
         * Skip link (Task 14) — same reasoning as the public (site) layout's:
         * lets a keyboard user jump past the sidebar/breadcrumb chrome
         * straight to the editor/list content, which repeats identically on
         * every admin screen.
         */}
        <a
          href="#admin-main-content"
          className="focus:bg-osi-gold-500 focus:text-osi-navy-900 sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded focus:px-4 focus:py-2 focus:text-sm"
        >
          Skip to main content
        </a>
        {/*
         * Mobile drawer — a native <dialog> via showModal(), same pattern as
         * ConfirmDialog/MediaPicker (CLAUDE.md): focus containment, Escape-
         * to-close, and focus restoration to the trigger button all come
         * from the browser for free. The dialog element itself fills the
         * viewport and doubles as its own dimmed backdrop (bg-osi-navy-900/60)
         * — clicking it outside the <aside> drawer closes it (checked via
         * event.target === currentTarget, the standard "click outside"
         * pattern for a full-bleed dialog); the old separate full-viewport
         * backdrop <button> is gone, so there's no more unstyled full-screen
         * focus-visible ring for keyboard users tabbing through the drawer.
         */}
        <dialog
          ref={drawerRef}
          onClose={() => setDrawerOpen(false)}
          onClick={(event) => {
            if (event.target === event.currentTarget) closeDrawer();
          }}
          aria-labelledby="admin-drawer-title"
          className="admin-mobile-dialog fixed inset-0 m-0 h-full max-h-none w-full max-w-none border-0 bg-slate-950/50 p-0 lg:hidden"
        >
          <aside className="admin-sidebar admin-mobile-sheet relative flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto px-3 py-5">
            <div className="mb-6 flex items-center justify-between">
              <span id="admin-drawer-title" className="px-2 text-base font-semibold tracking-tight">
                OSI Content
              </span>
              <IconButton
                onClick={closeDrawer}
                aria-label="Close menu"
                className="text-slate-200 hover:bg-white/10"
              >
                <CloseIcon />
              </IconButton>
            </div>
            <SidebarNav groups={groups} pathname={pathname} collapsed={false} />
            <SidebarFooter session={session} signOut={signOut} collapsed={false} />
          </aside>
        </dialog>

        {/* Desktop sidebar */}
        <aside
          className={`admin-sidebar sticky top-0 hidden h-dvh shrink-0 flex-col px-3 py-5 lg:flex ${sidebarCollapsed ? "w-[76px]" : "w-64"}`}
        >
          <Link
            href="/admin"
            aria-label="OSI Content dashboard"
            className="mb-7 flex h-10 items-center gap-3 px-3 text-base font-semibold tracking-tight"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-bold text-[var(--admin-primary)]">
              O
            </span>
            {!sidebarCollapsed && <span>OSI Content</span>}
          </Link>
          <SidebarNav groups={groups} pathname={pathname} collapsed={sidebarCollapsed} />
          <SidebarFooter session={session} signOut={signOut} collapsed={sidebarCollapsed} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="admin-topbar gap-2">
            <IconButton
              onClick={openDrawer}
              aria-label="Open menu"
              aria-haspopup="dialog"
              aria-expanded={drawerOpen}
              className="admin-mobile-only -ml-2"
            >
              <MenuIcon />
            </IconButton>
            <IconButton
              onClick={toggleSidebar}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!sidebarCollapsed}
              className="admin-desktop-only -ml-2"
            >
              <CollapseIcon collapsed={sidebarCollapsed} />
            </IconButton>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold lg:hidden">
                {activeItem?.label ?? "Admin"}
              </p>
              <nav
                aria-label="Breadcrumb"
                className="hidden min-w-0 items-center text-xs text-[var(--admin-ink-secondary)] lg:flex"
              >
                {breadcrumbs.map((crumb, index) => (
                  <span key={crumb.href} className="min-w-0">
                    {index > 0 && <span className="px-2 text-[var(--admin-border-strong)]">/</span>}
                    {index === breadcrumbs.length - 1 ? (
                      <span className="font-medium text-[var(--admin-ink)]">{crumb.label}</span>
                    ) : (
                      <Link href={crumb.href} className="hover:text-[var(--admin-ink)]">
                        {crumb.label}
                      </Link>
                    )}
                  </span>
                ))}
              </nav>
            </div>
            <span className="hidden max-w-64 truncate text-xs text-[var(--admin-ink-secondary)] sm:block">
              {session.email}
            </span>
          </header>
          <main id="admin-main-content" className="admin-main flex-1">
            <div key={pathname} className="admin-page-enter">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

function SidebarNav({
  groups,
  pathname,
  collapsed,
}: {
  groups: AdminNavGroup[];
  pathname: string;
  collapsed: boolean;
}) {
  return (
    <nav
      className="flex-1 space-y-5 overflow-y-auto overscroll-contain pr-1"
      aria-label="Admin navigation"
    >
      {groups.map((group) => (
        <div key={group.label}>
          {collapsed ? (
            <div className="mx-3 mb-2 h-px bg-white/10" aria-hidden="true" />
          ) : (
            <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wide text-slate-400">
              {group.label}
            </p>
          )}
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const isActive =
                item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={collapsed ? item.label : undefined}
                  className="admin-sidebar-link"
                  title={collapsed ? item.label : undefined}
                >
                  <AdminNavIcon href={item.href} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter({
  session,
  signOut,
  collapsed,
}: {
  session: { email: string; role: string };
  signOut: ReactNode;
  collapsed: boolean;
}) {
  return (
    <div className="mt-4 border-t border-white/10 pt-4 text-xs">
      {collapsed ? (
        <>
          <div
            className="mx-auto flex size-9 items-center justify-center rounded-full bg-white/10 font-semibold text-white"
            title={`${session.email} · ${session.role}`}
          >
            {session.email.slice(0, 1).toUpperCase()}
          </div>
          <div className="admin-collapsed-signout">{signOut}</div>
        </>
      ) : (
        <div className="px-3">
          <p className="truncate font-medium text-slate-100">{session.email}</p>
          <p className="mt-0.5 text-slate-400 capitalize">{session.role}</p>
          {signOut}
        </div>
      )}
    </div>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3 5h14M3 10h14M3 15h14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M4 4l10 10M14 4L4 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3.5 4.5h13v11h-13zM7.5 4.5v11"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d={collapsed ? "m11 7 3 3-3 3" : "m14 7-3 3 3 3"}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
