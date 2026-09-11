"use client";

import { useInView } from "motion/react";
import type { RefObject } from "react";
import { REVEAL_VIEWPORT, REVEAL_VIEWPORT_FULLY_VISIBLE } from "./variants";

/**
 * The single scroll-reveal trigger behind RevealSection, AnimatedSection
 * and AnimatedGroup. Returns true once — and stays true — as soon as
 * either condition in variants.ts is met, which between them cover every
 * element height (see the comments on both constants: the margin trigger
 * has no upper bound, the fully-visible trigger has no lower bound).
 *
 * Used with a controlled `animate={inView ? "visible" : "hidden"}` rather
 * than the `whileInView` gesture. `whileInView` pushes its state down to
 * the variant children that exist when it fires; a child mounted
 * afterwards never gets it and stays at `hidden` forever — which is what
 * stranded LabelPlateGrid's cards at opacity 0 when /products' category
 * filter swapped in a new set of them. `animate` is active by default on
 * every child, late-mounting ones included.
 */
export function useRevealInView(ref: RefObject<Element | null>): boolean {
  const crossedTheLine = useInView(ref, REVEAL_VIEWPORT);
  const fullyOnScreen = useInView(ref, REVEAL_VIEWPORT_FULLY_VISIBLE);

  return crossedTheLine || fullyOnScreen;
}
