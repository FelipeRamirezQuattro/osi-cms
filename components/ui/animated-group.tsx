"use client";

import { motion } from "motion/react";
import { useRef, type ReactNode } from "react";
import { useRevealInView } from "@/lib/motion/use-reveal-in-view";
import { useRevealVariants } from "@/lib/motion/use-reveal-variants";

/**
 * Stagger-aware pair for grids: wrap the grid in <AnimatedGroup>, each
 * child in <AnimatedItem> — children fade+rise in sequence as the group
 * enters the viewport, once. The trigger is useRevealInView + a
 * controlled `animate`, never the `whileInView` gesture; see that hook
 * for why (late-mounting children — e.g. LabelPlateGrid's cards after a
 * /products category-filter change — are stranded at opacity 0 by
 * `whileInView`).
 */
export function AnimatedGroup({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { stagger } = useRevealVariants();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useRevealInView(ref);

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={stagger}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { reveal } = useRevealVariants();

  return (
    <motion.div
      className={className}
      variants={reveal}
    >
      {children}
    </motion.div>
  );
}
