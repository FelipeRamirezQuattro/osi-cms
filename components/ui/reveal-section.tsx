"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { fadeRiseVariants } from "@/lib/motion/variants";

/**
 * Scroll-reveal for a whole <section>. The motion element IS the
 * <section>, never an inner wrapper: a transformed wrapper becomes the
 * containing block for absolutely-positioned descendants, which would
 * silently re-anchor the hero background images, CtaBreakoutBar's
 * overhang, and HairlineGrid overlays that several blocks rely on.
 * Section is already `relative`, so it is that containing block either
 * way — animating it changes nothing about where those children sit.
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

  return (
    <motion.section
      id={id}
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={reduceMotion ? undefined : fadeRiseVariants}
    >
      {children}
    </motion.section>
  );
}
