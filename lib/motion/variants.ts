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

// The scroll-reveal trigger every reveal primitive shares — see
// lib/motion/use-reveal-in-view.ts, which is the only thing that should
// consume these two. Reveal once, as soon as the element's leading edge
// crosses 15% of the viewport height up from the bottom.
//
// Deliberately margin-based, never `amount: <ratio>`: a ratio threshold
// asks for that fraction of the *element's own* area to intersect, which
// an element taller than `viewportHeight / ratio` can never satisfy,
// leaving it stuck at `hidden` forever. That is not hypothetical here —
// `scripts/migrate-legacy.ts` emits each migrated legacy page as a single
// `rich_text` block in a single `Section`, and the longest of those
// (terms-and-conditions) clears 6.7 viewport heights at phone width. A
// root-margin trigger has no upper bound on element height.
export const REVEAL_VIEWPORT = { once: true, margin: "0px 0px -15% 0px" } as const;

// ...and the other end of that trade: a negative bottom root margin is
// unreachable for anything that lives entirely inside the last 15% of
// the viewport once the document is scrolled as far as it goes — its top
// edge never gets above the shrunken detection edge. Real case: the last
// AnimatedGroup on /styleguide (no Footer below it, unlike every (site)
// route) missed by three pixels at 1280x900 and stayed invisible. Such an
// element is by definition shorter than 15% of the viewport, so it is
// fully on screen at that point, which is what this second trigger
// checks. Anything taller than 15% of the viewport clears the margin
// trigger first, so this one never changes the feel of a normal reveal.
export const REVEAL_VIEWPORT_FULLY_VISIBLE = { once: true, amount: "all" } as const;

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
