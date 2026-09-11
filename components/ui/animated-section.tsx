"use client";

import { motion, useReducedMotion } from "motion/react";
import { useRef, type ReactNode } from "react";
import { useRevealInView } from "@/lib/motion/use-reveal-in-view";
import { fadeRiseVariants, fadeRiseVariantsReduced } from "@/lib/motion/variants";

/**
 * Restrained, mechanical scroll-in for a single element: fade + 8px
 * rise, once, 400ms. Wraps its children in a plain <div>, so reach for
 * `Section`'s `reveal` prop (RevealSection, which animates the <section>
 * itself) to reveal a whole section, and for AnimatedGroup/AnimatedItem
 * (animated-group.tsx) when several siblings should stagger. All three
 * share useRevealInView, so they reveal on exactly one trigger — keep it
 * that way rather than giving this one its own.
 */
export function AnimatedSection({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useRevealInView(ref);

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={reduceMotion ? fadeRiseVariantsReduced : fadeRiseVariants}
    >
      {children}
    </motion.div>
  );
}
