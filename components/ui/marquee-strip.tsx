import type { ReactNode } from "react";

/**
 * A quiet partner/name strip. The original infinite marquee was removed:
 * important content should remain scannable without an always-moving
 * decorative loop or a pause control.
 */
export function MarqueeStrip({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-x-10 gap-y-5 ${className}`}>
      {children}
    </div>
  );
}
