"use client";

import { motion, useReducedMotion } from "motion/react";
import { useRef, type ReactNode } from "react";
import { useRevealInView } from "@/lib/motion/use-reveal-in-view";
import { fadeRiseVariants, fadeRiseVariantsReduced } from "@/lib/motion/variants";

/**
 * Scroll-reveal for a whole <section>. The motion element IS the
 * <section>, never an inner wrapper: a transformed wrapper becomes the
 * containing block for absolutely-positioned descendants, which would
 * silently re-anchor the hero background images, CtaBreakoutBar's
 * overhang, and HairlineGrid overlays that several blocks rely on.
 * Section is already `relative`, so it is that containing block either
 * way — animating it changes nothing about where those children sit.
 *
 * Triggered by useRevealInView (shared with AnimatedSection and
 * AnimatedGroup) rather than an `amount` ratio, so that a very tall
 * section — a migrated legacy page is one rich_text block in one Section
 * — can still reach the trigger.
 */
export function RevealSection({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const inView = useRevealInView(ref);

  return (
    <motion.section
      ref={ref}
      id={id}
      className={className}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={reduceMotion ? fadeRiseVariantsReduced : fadeRiseVariants}
    >
      {children}
    </motion.section>
  );
}
