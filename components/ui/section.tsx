import type { ReactNode } from "react";
import type { BlockBackground, BlockSpacingSide } from "@/lib/blocks/common";

const SPACING_CLASSES: Record<BlockSpacingSide, string> = {
  sm: "py-8",
  md: "py-16",
  lg: "py-24",
};

// Every block gets an optional anchorId, a background variant, and
// top/bottom spacing (see master prompt block registry intro). This is
// the one place that logic lives.
export function Section({
  background = "cream",
  spacingTop = "md",
  spacingBottom = "md",
  anchorId,
  seam,
  className = "",
  contentClassName = "mx-auto max-w-6xl px-6 md:px-12",
  children,
}: {
  background?: BlockBackground;
  spacingTop?: BlockSpacingSide;
  spacingBottom?: BlockSpacingSide;
  anchorId?: string;
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
  const paddingTop = SPACING_CLASSES[spacingTop].replace("py-", "pt-");
  const paddingBottom = SPACING_CLASSES[spacingBottom].replace("py-", "pb-");

  return (
    <section
      id={anchorId}
      className={`relative overflow-visible ${bgClass} ${seamClass} ${paddingTop} ${paddingBottom} ${className}`}
    >
      <div className={contentClassName}>{children}</div>
    </section>
  );
}
