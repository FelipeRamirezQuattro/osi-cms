import type { Transition, Variants } from "motion/react";

export const adminMotion = {
  fast: 0.14,
  standard: 0.2,
  pressScale: 0.98,
  distance: 5,
} as const;

export const adminEase = [0.22, 1, 0.36, 1] as const;

export const adminPageTransition: Transition = {
  duration: adminMotion.standard,
  ease: adminEase,
};

export const adminPageVariants: Variants = {
  hidden: { opacity: 0, y: adminMotion.distance },
  visible: { opacity: 1, y: 0, transition: adminPageTransition },
};

export const adminDialogVariants: Variants = {
  hidden: { opacity: 0, y: 6, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: adminPageTransition },
};

export const adminSheetTransition: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 42,
  mass: 0.9,
};
