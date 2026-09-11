"use client";

import Link from "next/link";
import { useState } from "react";
import type { NavItemNode } from "@/lib/data/navigation";

export function MegaMenuClient({
  utilityItems,
  megaColumns,
}: {
  utilityItems: NavItemNode[];
  megaColumns: NavItemNode[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-8">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-display text-sm tracking-wide-display uppercase"
          aria-expanded={open}
          aria-controls="mega-menu-panel"
        >
          Menu
        </button>
        <nav className="hidden items-center gap-6 lg:flex" aria-label="Utility">
          {utilityItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="font-display text-xs tracking-wide-display uppercase opacity-80 hover:opacity-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <input
          type="search"
          placeholder="What are you looking for?"
          className="hidden w-48 border-b border-current bg-transparent pb-1 text-sm placeholder:opacity-50 focus:outline-none lg:block"
          aria-label="Search"
        />
      </div>

      {open && (
        <div
          id="mega-menu-panel"
          className="fixed inset-0 z-50 overflow-y-auto bg-osi-navy-900 text-osi-white"
        >
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 md:px-12">
            <span className="font-display text-xl tracking-wide-display uppercase">OSI</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
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
                        onClick={() => setOpen(false)}
                        className="font-display text-sm tracking-wide-display uppercase opacity-90 hover:opacity-100"
                      >
                        {child.label}
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
