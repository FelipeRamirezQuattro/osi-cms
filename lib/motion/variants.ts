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

// Reduced-motion counterparts. `initial`/`whileInView` still need a real
// variant set to resolve against — passing `variants={undefined}` leaves
// Motion with nothing to apply, so a server-rendered `hidden` state (SSR
// can't know the client's motion preference) never gets cleared and the
// content stays invisible forever. These keep the opacity fade (the
// accessibility guidance this project follows: a gentle state change,
// not zero feedback and not invisible content) but drop the rise and
// make the transition instant. `y` is set explicitly to 0 in both states
// (not omitted) — `useReducedMotion()` resolves after mount, so the
// component briefly mounts against the full `fadeRiseVariants` (y: 8)
// before switching to this reduced set; if `y` were absent here Motion
// would never touch it and the 8px offset would be left stranded.
export const fadeRiseVariantsReduced: Variants = {
  hidden: { opacity: 0, y: 0 },
  visible: { opacity: 1, y: 0, transition: { duration: 0 } },
};

export const staggerContainerVariantsReduced: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0 } },
};
