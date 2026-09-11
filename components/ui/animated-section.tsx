"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { fadeRiseVariants, fadeRiseVariantsReduced } from "@/lib/motion/variants";

/**
 * Restrained, mechanical scroll-in: fade + 8px rise, once, 400ms.
 * Drop-in successor to the old CSS-only ScrollReveal — same feel,
 * Motion-driven so AnimatedGroup/AnimatedItem (animated-group.tsx) can
 * stagger several of these together.
 */
export function AnimatedSection({
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
      variants={reduceMotion ? fadeRiseVariantsReduced : fadeRiseVariants}
    >
      {children}
    </motion.div>
  );
}
