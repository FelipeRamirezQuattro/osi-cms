import Link from "next/link";
import type { ReactNode } from "react";
import { Clipped } from "./clipped";

/**
 * Motif 6 — the gold bar that overhangs a section's edge and crosses
 * the boundary into the next section (e.g. "FIND A DISTRIBUTOR"). The
 * parent section must be `relative` with visible overflow; position
 * this component via `className` (defaults to overhanging the bottom
 * right, the mockup's most common placement).
 */
export function CtaBreakoutBar({
  href,
  children,
  corner = "tl",
  className = "absolute right-8 bottom-0 z-10 translate-y-1/2",
}: {
  href: string;
  children: ReactNode;
  corner?: "tl" | "tr" | "bl" | "br";
  className?: string;
}) {
  return (
    <Link href={href} className={className}>
      <Clipped
        as="span"
        corner={corner}
        size="1.25rem"
        className="flex items-center gap-6 bg-osi-gold-500 py-4 pr-6 pl-10 font-display text-sm tracking-wide-display text-osi-navy-900 uppercase transition-colors hover:bg-osi-gold-400 motion-safe:animate-pulse-glow-gold"
      >
        {children}
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-osi-navy-900/60">
          →
        </span>
      </Clipped>
    </Link>
  );
}
