import type { ReactNode } from "react";

/**
 * Infinite horizontal scroll (Quattro §1) — CSS-only. The track renders
 * its children twice back-to-back (animate-marquee's translateX(-50%)
 * assumes exactly two copies) so the loop has no visible seam. Under
 * prefers-reduced-motion, the animation stops (site-wide rule) and the
 * duplicate copy is hidden so it reads as one static row, not a
 * doubled-up list.
 */
export function MarqueeStrip({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="flex w-max items-center gap-10 motion-safe:animate-marquee">
        <div className="flex items-center gap-10">{children}</div>
        <div className="flex items-center gap-10 motion-reduce:hidden" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
