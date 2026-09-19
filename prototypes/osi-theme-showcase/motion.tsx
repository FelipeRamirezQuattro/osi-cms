"use client";

import { motion, useScroll, useSpring, type Variants } from "motion/react";
import { useRef, type ReactNode } from "react";
import { useHydratedReducedMotion } from "@/lib/motion/use-hydrated-reduced-motion";
import { useRevealInView } from "@/lib/motion/use-reveal-in-view";
import type { ThemeSlug } from "./content";

type MotionProfile = {
  reveal: { x: number; y: number; scale: number; response: number };
  hero: { x: number; y: number; scale: number; response: number };
  mediaScale: number;
};

const profiles: Record<ThemeSlug, MotionProfile> = {
  forge: {
    reveal: { x: 0, y: 24, scale: 0.992, response: 0.48 },
    hero: { x: 0, y: 24, scale: 1, response: 0.5 },
    mediaScale: 1.035,
  },
  vector: {
    reveal: { x: 22, y: 0, scale: 0.996, response: 0.36 },
    hero: { x: -20, y: 0, scale: 1, response: 0.38 },
    mediaScale: 1.025,
  },
  horizon: {
    reveal: { x: 0, y: 18, scale: 0.994, response: 0.55 },
    hero: { x: 0, y: 18, scale: 0.996, response: 0.52 },
    mediaScale: 1.02,
  },
  fieldwork: {
    reveal: { x: -18, y: 0, scale: 1, response: 0.32 },
    hero: { x: 18, y: 0, scale: 1, response: 0.34 },
    mediaScale: 1.018,
  },
  signal: {
    reveal: { x: 0, y: 14, scale: 0.997, response: 0.42 },
    hero: { x: 0, y: 14, scale: 1, response: 0.42 },
    mediaScale: 1.025,
  },
};

function spring(response: number, delay = 0) {
  return { type: "spring" as const, bounce: 0, duration: response, delay };
}

function revealVariants(theme: ThemeSlug, reduced: boolean): Variants {
  if (reduced) {
    return {
      hidden: { opacity: 1, x: 0, y: 0, scale: 1 },
      visible: { opacity: 1, x: 0, y: 0, scale: 1, transition: { duration: 0 } },
    };
  }

  const profile = profiles[theme].reveal;
  return {
    hidden: { opacity: 0, x: profile.x, y: profile.y, scale: profile.scale },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      transition: spring(profile.response),
    },
  };
}

export function ThemeMotionProgress({ theme }: { theme: ThemeSlug }) {
  const reduceMotion = useHydratedReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 320, damping: 42, mass: 0.35 });

  if (reduceMotion) return null;

  return <motion.div className="theme-motion-progress" data-theme={theme} style={{ scaleX }} aria-hidden="true" />;
}

export function MotionHeroContent({
  theme,
  className,
  children,
}: {
  theme: ThemeSlug;
  className: string;
  children: ReactNode;
}) {
  const reduceMotion = useHydratedReducedMotion();
  const profile = profiles[theme].hero;
  const variants: Variants = reduceMotion
    ? { hidden: { x: 0, y: 0, scale: 1 }, visible: { x: 0, y: 0, scale: 1 } }
    : {
        hidden: { x: profile.x, y: profile.y, scale: profile.scale },
        visible: { x: 0, y: 0, scale: 1, transition: spring(profile.response, 0.04) },
      };

  return (
    <motion.div className={className} data-motion="hero" initial="hidden" animate="visible" variants={variants}>
      {children}
    </motion.div>
  );
}

export function MotionHeroMedia({
  theme,
  className,
  children,
}: {
  theme: ThemeSlug;
  className: string;
  children: ReactNode;
}) {
  const reduceMotion = useHydratedReducedMotion();
  const variants: Variants = reduceMotion
    ? { hidden: { scale: 1 }, visible: { scale: 1 } }
    : {
        hidden: { scale: profiles[theme].mediaScale },
        visible: { scale: 1, transition: spring(profiles[theme].hero.response + 0.1, 0.1) },
      };

  return (
    <motion.div className={className} data-motion="media" initial="hidden" animate="visible" variants={variants}>
      {children}
    </motion.div>
  );
}

export function RevealSection({
  theme,
  className,
  id,
  ariaLabel,
  children,
}: {
  theme: ThemeSlug;
  className: string;
  id?: string;
  ariaLabel?: string;
  children: ReactNode;
}) {
  const reduceMotion = useHydratedReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const inView = useRevealInView(ref);

  return (
    <motion.section
      ref={ref}
      id={id}
      aria-label={ariaLabel}
      className={className}
      data-motion="section"
      initial="hidden"
      animate={reduceMotion || inView ? "visible" : "hidden"}
      variants={revealVariants(theme, reduceMotion)}
    >
      {children}
    </motion.section>
  );
}
