"use client";

import type { AnchorHTMLAttributes } from "react";
import { trackEvent } from "@/lib/analytics/track-event";

/**
 * A tel:/mailto: anchor that fires a "contact_click" event without
 * blocking navigation. Exists as its own client leaf because several
 * callers (components/blocks/contact-details.tsx,
 * components/blocks/product-hero.tsx) are async server components that
 * fetch data via lib/data — see CLAUDE.md's block-registry gotcha: a
 * file can't co-export a block's Zod schema/defineBlock and also be
 * "use client", and an async server Render can't become a client
 * component at all. Passing href/label as props into this leaf is the
 * fix in both cases.
 */
export function TrackedLink({
  href,
  label,
  children,
  className,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className={className}
      onClick={() => trackEvent("contact_click", label)}
      {...rest}
    >
      {children}
    </a>
  );
}
