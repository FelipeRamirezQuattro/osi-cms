"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useLayoutTheme } from "@/components/branding/layout-theme-context";
import { useHydratedReducedMotion } from "@/lib/motion/use-hydrated-reduced-motion";
import {
  forgeHeroContentVariants,
  forgeHeroContentVariantsReduced,
  forgeHeroMediaVariants,
  forgeHeroMediaVariantsReduced,
} from "@/lib/motion/forge-motion";

/**
 * Hero entrance for the Forge theme. Classic renders a plain wrapper
 * (`display: contents` via the data hook), so its layout and markup weight are
 * unchanged. Neither variant touches opacity — heroes are the LCP element.
 */
export function HeroMotion({
  part,
  className,
  children,
}: {
  part: "content" | "media";
  className?: string;
  children: ReactNode;
}) {
  const layout = useLayoutTheme();
  const reduced = useHydratedReducedMotion();
  const hook = part === "content" ? { "data-hero-content": "" } : { "data-hero-backdrop": "" };

  if (layout !== "forge") {
    return (
      <div className={className} {...hook}>
        {children}
      </div>
    );
  }

  const variants =
    part === "content"
      ? reduced ? forgeHeroContentVariantsReduced : forgeHeroContentVariants
      : reduced ? forgeHeroMediaVariantsReduced : forgeHeroMediaVariants;

  return (
    <motion.div className={className} {...hook} initial="hidden" animate="visible" variants={variants}>
      {children}
    </motion.div>
  );
}
