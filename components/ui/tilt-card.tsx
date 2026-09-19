"use client";

import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import type { PointerEvent, ReactNode } from "react";
import { useHydratedReducedMotion } from "@/lib/motion/use-hydrated-reduced-motion";
import { tiltSpringConfig } from "@/lib/motion/variants";

const MAX_TILT_DEG = 6;

/**
 * Cursor-follow 3D tilt wrapper (Quattro's "TiltCard"). Wrap any card
 * (e.g. LabelPlateCard) in it to add a subtle perspective tilt that
 * follows the pointer. Inert under prefers-reduced-motion — the card
 * simply doesn't tilt, no fallback animation needed since this is a
 * pure hover embellishment, not something that communicates state.
 */
export function TiltCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useHydratedReducedMotion();
  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(pointerY, [0, 1], [MAX_TILT_DEG, -MAX_TILT_DEG]), tiltSpringConfig);
  const rotateY = useSpring(useTransform(pointerX, [0, 1], [-MAX_TILT_DEG, MAX_TILT_DEG]), tiltSpringConfig);

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (reduceMotion) return;
    const bounds = e.currentTarget.getBoundingClientRect();
    pointerX.set((e.clientX - bounds.left) / bounds.width);
    pointerY.set((e.clientY - bounds.top) / bounds.height);
  }

  function handlePointerLeave() {
    pointerX.set(0.5);
    pointerY.set(0.5);
  }

  return (
    <motion.div
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={reduceMotion ? undefined : { rotateX, rotateY, transformPerspective: 800 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
