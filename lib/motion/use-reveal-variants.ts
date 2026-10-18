"use client";

import type { Variants } from "motion/react";
import { useLayoutTheme } from "@/components/branding/layout-theme-context";
import { useHydratedReducedMotion } from "@/lib/motion/use-hydrated-reduced-motion";
import {
  forgeRevealVariants,
  forgeRevealVariantsReduced,
  forgeStaggerVariants,
} from "@/lib/motion/forge-motion";
import {
  fadeRiseVariants,
  fadeRiseVariantsReduced,
  staggerContainerVariants,
  staggerContainerVariantsReduced,
} from "@/lib/motion/variants";

/** The reveal + stagger variant sets for the active layout theme and the visitor's reduced-motion setting. */
export function useRevealVariants(): { reveal: Variants; stagger: Variants } {
  const layout = useLayoutTheme();
  const reduced = useHydratedReducedMotion();
  if (layout === "forge") {
    return {
      reveal: reduced ? forgeRevealVariantsReduced : forgeRevealVariants,
      stagger: reduced ? staggerContainerVariantsReduced : forgeStaggerVariants,
    };
  }
  return {
    reveal: reduced ? fadeRiseVariantsReduced : fadeRiseVariants,
    stagger: reduced ? staggerContainerVariantsReduced : staggerContainerVariants,
  };
}
