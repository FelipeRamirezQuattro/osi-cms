"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { NavItemNode } from "@/lib/data/navigation";
import { motion, useReducedMotion } from "motion/react";
import { springTransition } from "@/lib/motion/variants";
import { externalLinkAttrs } from "@/lib/routes";
import { ExternalLinkIcon } from "@/components/ui/external-link-icon";

export function MegaMenuClient({
  utilityItems,
  megaColumns,
}: {
  utilityItems: NavItemNode[];
  megaColumns: NavItemNode[];
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  // Move focus into the panel on open, back to the trigger on close (WCAG
  // 2.4.3 focus order) — this is a full-viewport overlay, so without this
  // a keyboard user's focus would silently stay on/behind a hidden "Menu"
  // button.
  useEffect(() => {
    if (open) closeButtonRef.current?.focus();
  }, [open]);

  // Escape closes; Tab is trapped inside the panel while open (WCAG 2.1.2
  // — an overlay this size must not let keyboard focus wander onto the
  // page content it's covering).
  function onPanelKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== "Tab" || !panelRef.current) return;

    const focusable = panelRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled])',
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      <div className="flex items-center gap-8">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          className="font-display text-sm tracking-wide-display uppercase transition-transform duration-200 active:scale-[0.97]"
          aria-expanded={open}
          aria-controls="mega-menu-panel"
        >
          Menu
        </button>
        <nav
          className="hidden items-center gap-6 lg:flex"
          aria-label="Utility"
          onMouseLeave={() => setHoveredId(null)}
        >
          {utilityItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              onMouseEnter={() => setHoveredId(item.id)}
              onFocus={() => setHoveredId(item.id)}
              onBlur={() => setHoveredId(null)}
              className="relative font-display text-xs tracking-wide-display uppercase opacity-80 hover:opacity-100"
              {...externalLinkAttrs(item.is_external)}
            >
              {item.label}
              {item.is_external && <ExternalLinkIcon className="ml-1 text-[0.85em]" />}
              {hoveredId === item.id && (
                <motion.span
                  layoutId="utility-nav-underline"
                  className="absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-osi-gold-500"
                  transition={reduceMotion ? { duration: 0 } : springTransition}
                />
              )}
            </Link>
          ))}
        </nav>
        <form action="/search" method="get" className="hidden lg:block">
          <input
            type="search"
            name="q"
            inputMode="search"
            autoComplete="off"
            placeholder="What are you looking for?"
            className="w-48 border-b border-current bg-transparent pb-1 text-sm placeholder:opacity-50"
            aria-label="Search"
          />
        </form>
      </div>

      {open && (
        <div
          id="mega-menu-panel"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          onKeyDown={onPanelKeyDown}
          className="fixed inset-0 z-50 overflow-y-auto bg-osi-navy-900 text-osi-white"
        >
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 md:px-12">
            <span className="font-display text-xl tracking-wide-display uppercase">OSI</span>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={close}
              aria-label="Close menu"
              className="flex h-10 w-10 items-center justify-center border border-current"
            >
              ✕
            </button>
          </div>
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 pb-16 sm:grid-cols-2 md:px-12 lg:grid-cols-4">
            {megaColumns.map((column) => (
              <div key={column.id}>
                <h3 className="mb-4 font-display text-sm tracking-wide-display uppercase text-osi-gold-500">
                  {column.label}
                </h3>
                <ul className="space-y-3">
                  {column.children.map((child) => (
                    <li key={child.id}>
                      <Link
                        href={child.href}
                        onClick={close}
                        className="font-display text-sm tracking-wide-display uppercase opacity-90 hover:opacity-100"
                        {...externalLinkAttrs(child.is_external)}
                      >
                        {child.label}
                        {child.is_external && <ExternalLinkIcon className="ml-1 text-[0.85em]" />}
                        {child.badge && (
                          <span className="ml-2 text-osi-gold-500">{child.badge}</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
