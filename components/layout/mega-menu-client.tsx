"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { NavItemNode } from "@/lib/data/navigation";
import { externalLinkAttrs } from "@/lib/routes";
import { ExternalLinkIcon } from "@/components/ui/external-link-icon";

const PRIMARY_LINKS = [
  { label: "Products", href: "/products" },
  { label: "Resources", href: "/resources" },
  { label: "About", href: "/about-us" },
] as const;

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8">
      {open ? (
        <>
          <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M4 8h16M4 16h16" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export function MegaMenuClient({
  utilityItems,
  megaColumns,
  brandLogo,
}: {
  utilityItems: NavItemNode[];
  megaColumns: NavItemNode[];
  brandLogo?: ReactNode;
}) {
  // Next can return null before router context is ready (and our static
  // contract tests intentionally render this component without one).
  const pathname = usePathname() ?? "";
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const menuDialogRef = useRef<HTMLDialogElement>(null);
  const searchDialogRef = useRef<HTMLDialogElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  function openMenu() {
    menuDialogRef.current?.showModal();
    setMenuOpen(true);
  }

  function closeMenu() {
    menuDialogRef.current?.close();
    setMenuOpen(false);
  }

  function openSearch() {
    searchDialogRef.current?.showModal();
    setSearchOpen(true);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }

  function closeSearch() {
    searchDialogRef.current?.close();
    setSearchOpen(false);
  }

  function isActive(href: string) {
    return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
  }

  return (
    <>
      <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
        <nav className="mr-auto hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          {PRIMARY_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className="group relative inline-flex min-h-11 items-center rounded-full px-4 font-body text-sm font-medium text-white/74 transition-[color,background-color] duration-200 hover:bg-white/7 hover:text-white aria-[current=page]:text-white"
            >
              {item.label}
              <span
                aria-hidden="true"
                className="absolute inset-x-4 bottom-1.5 h-px origin-left scale-x-0 bg-brand-accent-dark transition-transform duration-200 group-aria-[current=page]:scale-x-100"
              />
            </Link>
          ))}
        </nav>
        <button
          type="button"
          onClick={openSearch}
          aria-label="Search"
          aria-haspopup="dialog"
          aria-expanded={searchOpen}
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 font-body text-sm font-medium text-white/80 transition-[color,background-color,transform] duration-200 hover:bg-white/8 hover:text-white active:scale-[0.98] sm:px-4"
        >
          <SearchIcon />
          <span className="hidden sm:inline">Search</span>
        </button>
        <button
          type="button"
          onClick={openMenu}
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/18 px-3 font-body text-sm font-semibold transition-[color,background-color,border-color,transform] duration-200 hover:border-white/35 hover:bg-white/8 active:scale-[0.98] sm:px-4"
        >
          <MenuIcon open={menuOpen} />
          Menu
        </button>
      </div>

      <dialog
        ref={searchDialogRef}
        onClose={() => setSearchOpen(false)}
        aria-labelledby="site-search-title"
        className="site-dialog fixed inset-x-0 top-0 z-60 w-full bg-brand-surface-dark text-brand-text-dark shadow-2xl"
      >
        <div className="mx-auto max-w-[var(--site-container)] px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-8 md:px-10 md:pb-12">
          <div className="mb-8 flex items-center justify-between gap-6">
            <p id="site-search-title" className="font-editorial text-xl font-semibold">
              Search OSI
            </p>
            <button
              type="button"
              onClick={closeSearch}
              aria-label="Close search"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/18 transition-[background-color,border-color,transform] duration-200 hover:border-white/35 hover:bg-white/8 active:scale-[0.98]"
            >
              <MenuIcon open />
            </button>
          </div>
          <form action="/search" method="get" className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <label className="flex-1">
              <span className="mb-2 block text-sm font-medium text-white/72">What are you looking for?</span>
              <span className="flex min-h-14 items-center gap-3 border-b border-white/35 focus-within:border-osi-gold-500">
                <SearchIcon />
                <input
                  ref={searchInputRef}
                  type="search"
                  name="q"
                  inputMode="search"
                  autoComplete="off"
                  placeholder="Products, resources, locations…"
                  className="min-w-0 flex-1 bg-transparent py-3 text-lg text-white outline-none placeholder:text-white/38"
                />
              </span>
            </label>
            <button
              type="submit"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-osi-gold-500 px-6 text-sm font-semibold text-osi-navy-900 transition-[background-color,transform] duration-200 hover:bg-osi-gold-400 active:scale-[0.98]"
            >
              Search
            </button>
          </form>
        </div>
      </dialog>

      <dialog
        id="mega-menu-panel"
        ref={menuDialogRef}
        onClose={() => setMenuOpen(false)}
        aria-labelledby="site-menu-title"
        className="site-dialog fixed inset-0 z-60 h-dvh w-full overflow-y-auto bg-brand-surface-dark text-brand-text-dark"
      >
        <div className="mx-auto min-h-full max-w-[var(--site-container)] px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] md:px-10">
          <div className="flex min-h-14 items-center justify-between border-b border-white/12 pb-5">
            <span id="site-menu-title" className="font-display text-xl font-bold tracking-wide-display uppercase">
              {brandLogo ?? <>OSI<span className="text-brand-accent-dark">.</span></>}
            </span>
            <button
              type="button"
              onClick={closeMenu}
              aria-label="Close menu"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/18 transition-[background-color,border-color,transform] duration-200 hover:border-white/35 hover:bg-white/8 active:scale-[0.98]"
            >
              <MenuIcon open />
            </button>
          </div>

          <div className="grid gap-12 py-10 lg:grid-cols-[1fr_3fr] lg:gap-16 lg:py-14">
            <div>
              <p className="mb-5 text-xs font-semibold tracking-[0.12em] text-brand-accent-dark uppercase">Explore</p>
              <nav aria-label="Featured pages" className="flex flex-col items-start gap-2">
                {PRIMARY_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className="group inline-flex min-h-11 items-center gap-3 font-editorial text-[clamp(1.5rem,3vw,2.4rem)] font-semibold leading-tight text-white/82 transition-colors duration-200 hover:text-white aria-[current=page]:text-osi-gold-400"
                  >
                    <span aria-hidden="true" className="text-sm text-osi-gold-500 transition-transform duration-200 group-hover:translate-x-1">→</span>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            <nav aria-label="Product and resource menu" className="grid gap-x-10 gap-y-10 sm:grid-cols-2 xl:grid-cols-4">
              {megaColumns.map((column) => (
                <div key={column.id}>
                  <h2 className="mb-4 text-xs font-semibold tracking-[0.12em] text-osi-gold-500 uppercase">
                    {column.label}
                  </h2>
                  <ul className="space-y-1">
                    {column.children.map((child) => (
                      <li key={child.id}>
                        <Link
                          href={child.href}
                          onClick={closeMenu}
                          aria-current={isActive(child.href) ? "page" : undefined}
                          className="inline-flex min-h-10 items-center py-1 text-sm leading-snug text-white/72 transition-colors duration-200 hover:text-white aria-[current=page]:text-white"
                          {...externalLinkAttrs(child.is_external)}
                        >
                          {child.label}
                          {child.is_external && <ExternalLinkIcon className="ml-1 text-[0.85em]" />}
                          {child.badge && (
                            <span className="ml-2 rounded-full bg-osi-gold-500/14 px-2 py-0.5 text-[0.65rem] font-semibold tracking-[0.08em] text-osi-gold-400 uppercase">
                              {child.badge}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>

          {utilityItems.length > 0 && (
            <nav aria-label="Utility" className="flex flex-wrap gap-x-7 gap-y-2 border-t border-white/12 pt-6">
              {utilityItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={closeMenu}
                  className="inline-flex min-h-10 items-center text-sm font-medium text-white/64 transition-colors duration-200 hover:text-white"
                  {...externalLinkAttrs(item.is_external)}
                >
                  {item.label}
                  {item.is_external && <ExternalLinkIcon className="ml-1 text-[0.85em]" />}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </dialog>
    </>
  );
}
