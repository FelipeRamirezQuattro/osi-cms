"use client";

import { useEffect, useRef } from "react";

/**
 * Marks the enclosing site header `data-scrolled` once the page has moved off
 * the top, so the Forge header can sit translucent over a hero and turn solid
 * afterwards. It only toggles a CSS hook attribute — classic ignores it — via
 * a passive scroll listener that does one read and one attribute write per
 * threshold crossing.
 */
export function HeaderScrollState() {
  const anchor = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const header = anchor.current?.closest<HTMLElement>("[data-site-header]");
    if (!header) return;
    let scrolled: boolean | null = null;
    const sync = () => {
      const next = window.scrollY > 8;
      if (next === scrolled) return;
      scrolled = next;
      header.toggleAttribute("data-scrolled", next);
    };
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, []);

  return <span ref={anchor} hidden />;
}
