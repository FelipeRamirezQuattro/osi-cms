import type { Transition, Variants } from "motion/react";

// Mirrors app/globals.css's --ease-osi curve so CSS transitions and
// Framer Motion animations share one feel — no second easing curve.
export const EASE_OSI = [0.22, 0.61, 0.36, 1] as const;

// Critically damped (no overshoot) — the house default per the
// apple-design skill: nothing on this site is gesture/momentum-driven,
// so bounce is never used here.
export const springTransition: Transition = { type: "spring", bounce: 0, duration: 0.4 };

// useSpring() (tilt-card.tsx) takes physics params, not the
// bounce/duration shorthand above — stiffness/damping tuned to the same
// "snappy, no visible overshoot" feel.
export const tiltSpringConfig = { stiffness: 300, damping: 30 } as const;

export const fadeRiseVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OSI } },
};

export const staggerContainerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
