"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { fadeRiseVariants, staggerContainerVariants } from "@/lib/motion/variants";

/**
 * Stagger-aware pair for grids: wrap the grid in <AnimatedGroup>, each
 * child in <AnimatedItem> — children fade+rise in sequence as the group
 * enters the viewport, once.
 */
export function AnimatedGroup({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={reduceMotion ? undefined : staggerContainerVariants}
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
  const reduceMotion = useReducedMotion();

  return (
    <motion.div className={className} variants={reduceMotion ? undefined : fadeRiseVariants}>
      {children}
    </motion.div>
  );
}
