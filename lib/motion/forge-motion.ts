import type { Transition, Variants } from "motion/react";

/**
 * Forge motion recipe, ported from the approved prototype
 * (prototypes/osi-theme-showcase/motion.tsx, "forge" profile). Classic keeps
 * lib/motion/variants.ts. Same trigger (useRevealInView) and the same
 * reduced-motion contract: every variant set has a reduced twin that does not
 * move and does not spring.
 */
export const FORGE_MOTION = {
  reveal: { y: 24, scale: 0.992, response: 0.48 },
  hero: { y: 24, response: 0.5, delay: 0.04 },
  mediaScale: 1.035,
  mediaDelay: 0.1,
  stagger: 0.08,
} as const;

function spring(response: number, delay = 0): Transition {
  return { type: "spring", bounce: 0, duration: response, delay };
}

export const forgeRevealVariants: Variants = {
  hidden: { opacity: 0, y: FORGE_MOTION.reveal.y, scale: FORGE_MOTION.reveal.scale },
  visible: { opacity: 1, y: 0, scale: 1, transition: spring(FORGE_MOTION.reveal.response) },
};

export const forgeRevealVariantsReduced: Variants = {
  hidden: { opacity: 0, y: 0, scale: 1 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0 } },
};

export const forgeStaggerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: FORGE_MOTION.stagger } },
};

/** Hero copy rises into place. Opacity is deliberately untouched: the hero is the LCP element. */
export const forgeHeroContentVariants: Variants = {
  hidden: { y: FORGE_MOTION.hero.y },
  visible: { y: 0, transition: spring(FORGE_MOTION.hero.response, FORGE_MOTION.hero.delay) },
};

export const forgeHeroContentVariantsReduced: Variants = {
  hidden: { y: 0 },
  visible: { y: 0 },
};

/** Hero photograph settles from a slight zoom — again no opacity change. */
export const forgeHeroMediaVariants: Variants = {
  hidden: { scale: FORGE_MOTION.mediaScale },
  visible: {
    scale: 1,
    transition: spring(FORGE_MOTION.hero.response + 0.1, FORGE_MOTION.mediaDelay),
  },
};

export const forgeHeroMediaVariantsReduced: Variants = {
  hidden: { scale: 1 },
  visible: { scale: 1 },
};
