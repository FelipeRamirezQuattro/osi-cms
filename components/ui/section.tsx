import type { ReactNode } from "react";
import type { BlockBackground, BlockSpacingSide } from "@/lib/blocks/common";
import { RevealSection } from "./reveal-section";

// Both maps spell every class out literally. Tailwind scans source for
// literal class strings, so a class assembled at runtime — this used to be
// SPACING_CLASSES[side].replace("py-", "pt-") — is never emitted into the
// CSS bundle. `pt-16` (the `md` default, i.e. most sections on the site)
// and `pb-8` were silently missing, so nearly every section rendered with
// padding-top: 0 and stacked flush against the one above it.
const PADDING_TOP_CLASSES: Record<BlockSpacingSide, string> = {
  sm: "pt-8",
  md: "pt-16",
  lg: "pt-24",
};

const PADDING_BOTTOM_CLASSES: Record<BlockSpacingSide, string> = {
  sm: "pb-8",
  md: "pb-16",
  lg: "pb-24",
};

// Every block gets an optional anchorId, a background variant, and
// top/bottom spacing (see master prompt block registry intro). This is
// the one place that logic lives.
export function Section({
  background = "cream",
  spacingTop = "md",
  spacingBottom = "md",
  anchorId,
  reveal = true,
  seam,
  className = "",
  contentClassName = "mx-auto max-w-[var(--site-container)] px-5 md:px-10",
  children,
}: {
  background?: BlockBackground;
  spacingTop?: BlockSpacingSide;
  spacingBottom?: BlockSpacingSide;
  anchorId?: string;
  reveal?: boolean;
  seam?: "top" | "bottom" | "both";
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}) {
  const bgClass =
    background === "navy"
      ? "bg-osi-navy-900 text-osi-white"
      : background === "cream"
        ? "bg-osi-cream-100 text-osi-navy-900"
        : "bg-transparent";
  const seamClass =
    seam === "both"
      ? "diagonal-seam-t diagonal-seam-b"
      : seam === "top"
        ? "diagonal-seam-t"
        : seam === "bottom"
          ? "diagonal-seam-b"
          : "";
  const paddingTop = PADDING_TOP_CLASSES[spacingTop];
  const paddingBottom = PADDING_BOTTOM_CLASSES[spacingBottom];

  const sectionClassName = `relative overflow-visible ${bgClass} ${seamClass} ${paddingTop} ${paddingBottom} ${className}`;
  const content = <div className={contentClassName}>{children}</div>;

  // Blocks that drive their own entrance motion (staggered grids) or that
  // must paint immediately (heroes — an opacity-0 start delays LCP) pass
  // reveal={false} and render as a plain server-rendered <section>.
  if (!reveal) {
    return (
      <section id={anchorId} className={sectionClassName}>
        {content}
      </section>
    );
  }

  return (
    <RevealSection id={anchorId} className={sectionClassName}>
      {content}
    </RevealSection>
  );
}
