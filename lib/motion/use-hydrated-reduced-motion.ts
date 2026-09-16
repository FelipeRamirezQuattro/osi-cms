"use client";

import { useReducedMotion } from "motion/react";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Returns the user's reduced-motion preference without changing the first
 * client render from the server-rendered markup. Motion's useReducedMotion()
 * reads matchMedia during its client initializer, while SSR cannot know that
 * preference; using it directly to choose variants can therefore produce a
 * hydration mismatch for visitors who request reduced motion.
 */
export function useHydratedReducedMotion(): boolean {
  const reduceMotion = useReducedMotion();
  const hydrated = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  return hydrated && reduceMotion === true;
}
