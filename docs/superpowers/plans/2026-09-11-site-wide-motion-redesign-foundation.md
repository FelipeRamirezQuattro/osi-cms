# Site-wide motion redesign — Foundation & primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the motion foundation (tokens, keyframes, shared Framer Motion config, reduced-motion strategy) and the primitive-level motion components, wire them into the Header/Footer and the `/styleguide` reference page, so every later block gets to reuse an already-proven set of building blocks.

**Architecture:** CSS-first (Tailwind v4 `@theme` keyframes/animate entries) for anything that doesn't need JS; a small `lib/motion/variants.ts` module of shared Framer Motion constants for the handful of effects that do (tilt, stagger, shared-layout underline). One new dependency (`motion`). Every new/extended `components/ui/*` primitive gets a live preview wired into `/styleguide` in the same task that creates it, so each task is visually verifiable on its own, not just type-checked.

**Tech Stack:** Next.js 16 (App Router, TS strict), Tailwind v4, `motion` (Framer Motion) — new dependency added in Task 1.

**Spec:** `docs/superpowers/specs/2026-09-11-site-wide-motion-redesign-design.md`

## Global Constraints

- Gold glow/shadow/gradient is reserved for primary CTAs (`ArrowButton` `solid-gold`/CTA usage, `CtaBreakoutBar`) — everywhere else uses a neutral navy/`osi-steel-500` variant. Grep for every new `gold` usage before a task is considered done.
- Exactly one new dependency this plan: `motion`. No other animation/gesture library.
- No second easing curve — reuse the existing `--ease-osi` (`cubic-bezier(0.22, 0.61, 0.36, 1)`) everywhere, in both CSS and the Framer Motion `EASE_OSI` constant.
- `prefers-reduced-motion: reduce` must be respected by every new primitive — the CSS media query for CSS-only effects, `useReducedMotion()` in-component for every Framer Motion component.
- `:focus-visible` (`app/globals.css`) is never overridden with `focus:outline-none` without an equally visible replacement. Nothing in this plan touches it.
- Decorative/static motifs (`clipped.tsx`, `hairline-grid.tsx`, `duotone-image.tsx`) stay structurally static in this plan — no task here adds animation to them.
- `pnpm build`, `pnpm lint`, `pnpm exec tsc --noEmit` clean at the end of every task.
- English only in code/comments/docs.

---

### Task 1: Install `motion` and add the shared motion config

**Files:**
- Modify: `package.json` (new dependency)
- Create: `lib/motion/variants.ts`

**Interfaces:**
- Produces: `EASE_OSI: readonly [number, number, number, number]`, `springTransition: Transition` (`{ type: "spring", bounce: 0, duration: 0.4 }`), `tiltSpringConfig: { stiffness: number; damping: number }`, `fadeRiseVariants: Variants`, `staggerContainerVariants: Variants`. `tiltSpringConfig` is consumed by Task 6; `fadeRiseVariants`/`staggerContainerVariants` by Task 7; `springTransition` by Task 10 (the nav underline — Apple's own documented value for a "move/reposition" interaction is damping 1.0/response 0.4s, which is exactly this constant).

- [ ] **Step 1: Install the dependency**

Run: `pnpm add motion`
Expected: `package.json` gains a `"motion": "^<version>"` entry under `dependencies`; `pnpm-lock.yaml` updates.

- [ ] **Step 2: Create `lib/motion/variants.ts`**

```ts
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
```

- [ ] **Step 3: Verify**

Run: `pnpm exec tsc --noEmit && pnpm build`
Expected: both succeed. `lib/motion/variants.ts` has no consumers yet, so there's nothing to render — this task is verified by successful type-checking against the real `motion/react` types (confirms the package installed correctly), not a visual check.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml lib/motion/variants.ts
git commit -m "$(cat <<'EOF'
Add motion dependency and shared motion config

Single new dependency for the site-wide motion redesign, scoped to a
handful of Framer Motion effects (tilt-card, staggered reveal, nav
underline) per the design spec. EASE_OSI mirrors --ease-osi so CSS and
JS-driven motion share one curve.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Foundation CSS — keyframes, animate utilities, site-wide reduced-motion

**Files:**
- Modify: `app/globals.css`
- Modify: `app/styleguide/page.tsx`

**Interfaces:**
- Produces: Tailwind utilities `animate-float`, `animate-gradient-shift`, `animate-marquee`, `animate-spin-slow`, `animate-pulse-glow-gold`, `animate-pulse-glow` — consumed by Tasks 4, 8, 9 and (for float/spin-slow) available for the later block-rollout plan.

- [ ] **Step 1: Add the keyframes + `--animate-*` theme entries, replace the old reveal-only reduced-motion rule**

In `app/globals.css`, add six lines to the existing `@theme` block, directly after `--ease-osi: cubic-bezier(0.22, 0.61, 0.36, 1);`:

```css
  --animate-float: float 6s ease-in-out infinite;
  --animate-gradient-shift: gradientShift 8s ease infinite;
  --animate-marquee: marquee 30s linear infinite;
  --animate-spin-slow: spin 8s linear infinite;
  --animate-pulse-glow-gold: pulseGlowGold 2s ease-in-out infinite;
  --animate-pulse-glow: pulseGlow 2s ease-in-out infinite;
```

Then replace the whole "Motif 6 — restrained, mechanical scroll-reveal" block (the `reveal-init`/`reveal-in` `@utility` pair plus its scoped `@media (prefers-reduced-motion: reduce)` override, at the end of the file) with:

```css
/*
 * Motion foundation (site-wide redesign) — keyframes for the
 * --animate-* theme entries above. Kept as literal top-level
 * @keyframes (not inside @theme) — same pattern Tailwind itself uses
 * for animate-spin/animate-pulse's built-in keyframes.
 * See docs/superpowers/specs/2026-09-11-site-wide-motion-redesign-design.md.
 */
@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20px);
  }
}
@keyframes gradientShift {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}
@keyframes marquee {
  0% {
    transform: translateX(0%);
  }
  100% {
    transform: translateX(-50%);
  }
}
@keyframes pulseGlowGold {
  0%,
  100% {
    box-shadow: 0 0 20px color-mix(in srgb, var(--color-osi-gold-500) 30%, transparent);
  }
  50% {
    box-shadow: 0 0 40px color-mix(in srgb, var(--color-osi-gold-500) 70%, transparent);
  }
}
@keyframes pulseGlow {
  0%,
  100% {
    box-shadow: 0 0 20px color-mix(in srgb, var(--color-osi-steel-500) 30%, transparent);
  }
  50% {
    box-shadow: 0 0 40px color-mix(in srgb, var(--color-osi-steel-500) 60%, transparent);
  }
}

/*
 * prefers-reduced-motion: reduce — site-wide (supersedes the old
 * reveal-init/reveal-in-only override). Truncates every CSS
 * animation/transition to effectively instant rather than disabling
 * them outright, so opacity/color state changes still communicate —
 * just without motion. Framer Motion components additionally check
 * useReducedMotion() in-component (lib/motion/variants.ts consumers)
 * since this media query alone doesn't cover JS-driven motion.
 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 2: Add a "Motion foundation" preview section to `/styleguide`**

In `app/styleguide/page.tsx`, insert a new `<Section>` directly after the existing "Hairline grid + stat band" section (before the "Label-plate card" section):

```tsx
      <Section bg="navy" className="pb-24">
        <Heading>Motion foundation</Heading>
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          <div className="flex flex-col items-center gap-4">
            <div aria-hidden className="h-16 w-16 rounded-full bg-osi-steel-500 motion-safe:animate-float" />
            <p className="text-xs tracking-wide-label text-osi-slate-200 uppercase">Float</p>
          </div>
          <div className="flex flex-col items-center gap-4">
            <div
              aria-hidden
              className="h-16 w-16 rounded-full bg-osi-gold-500 motion-safe:animate-pulse-glow-gold"
            />
            <p className="text-xs tracking-wide-label text-osi-slate-200 uppercase">
              Pulse glow — gold (CTA-only)
            </p>
          </div>
          <div className="flex flex-col items-center gap-4">
            <div
              aria-hidden
              className="h-16 w-16 rounded-full bg-osi-steel-500 motion-safe:animate-pulse-glow"
            />
            <p className="text-xs tracking-wide-label text-osi-slate-200 uppercase">
              Pulse glow — neutral
            </p>
          </div>
        </div>
        <div
          aria-hidden
          className="mt-10 h-3 w-full rounded-full bg-size-[300%_300%] motion-safe:animate-gradient-shift [background-image:linear-gradient(-45deg,var(--color-osi-navy-700),var(--color-osi-steel-500),var(--color-osi-navy-600),var(--color-osi-steel-500))]"
        />
      </Section>
```

- [ ] **Step 3: Verify**

Run: `pnpm build && pnpm lint && pnpm exec tsc --noEmit`
Expected: all three succeed (the `@keyframes` blocks and `@theme` additions are valid CSS Tailwind will parse without error).

Run: `pnpm dev`, open `http://localhost:3000/styleguide` in a browser.
Expected: a new navy "Motion foundation" section renders between "Hairline grid + stat band" and "Label-plate card" — a circle bobbing up and down (float), a gold circle pulsing a soft glow, a steel-blue circle pulsing a soft glow, and a slow-shifting diagonal gradient bar. Toggle `prefers-reduced-motion: reduce` in devtools (Rendering tab → Emulate CSS media feature) and confirm all four go static.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/styleguide/page.tsx
git commit -m "$(cat <<'EOF'
Add motion-foundation keyframes and site-wide reduced-motion rule

Replaces the old reveal-init/reveal-in-scoped override with a universal
prefers-reduced-motion rule, and adds the five Quattro-derived keyframes
(float, gradient-shift, marquee, spin-slow, plus a gold/neutral
pulse-glow pair per the gold-scarcity decision) as Tailwind v4
--animate-* theme entries, previewed on /styleguide.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `ArrowButton` — pointer-down press feedback

**Files:**
- Modify: `components/ui/arrow-button.tsx`

**Interfaces:**
- No signature change — `ArrowButton`'s props are untouched. Purely additive classes.

- [ ] **Step 1: Add press feedback to both the pill and the ghost-arrow variants**

In `components/ui/arrow-button.tsx`, the ghost-arrow `content` span (line 35) currently reads:

```tsx
      <span className="group inline-flex items-center gap-2 font-display text-sm tracking-wide-display uppercase">
```

Change to:

```tsx
      <span className="group inline-flex items-center gap-2 font-display text-sm tracking-wide-display uppercase transition-transform duration-200 active:scale-[0.97]">
```

And the `shared` class string for the pill variants (line 56) currently reads:

```tsx
  const shared = `group inline-flex items-center gap-4 rounded-full border py-2 pr-2 pl-6 font-display text-sm tracking-wide-display uppercase transition-colors ${VARIANT_CLASSES[variant]} ${className}`;
```

Change to:

```tsx
  const shared = `group inline-flex items-center gap-4 rounded-full border py-2 pr-2 pl-6 font-display text-sm tracking-wide-display uppercase transition-[color,background-color,border-color,transform] duration-200 active:scale-[0.97] ${VARIANT_CLASSES[variant]} ${className}`;
```

(`transition-colors` is replaced with an explicit property list because `transform` now also needs to transition — `transition-all` is avoided per the spec's "prefer the narrower property list" guardrail.)

- [ ] **Step 2: Verify**

Run: `pnpm build && pnpm lint && pnpm exec tsc --noEmit`
Expected: all succeed.

Run: `pnpm dev`, open `http://localhost:3000/styleguide`, scroll to "Circled-arrow button".
Expected: clicking and holding any of the five button variants shown there visibly shrinks it slightly (scale 0.97) for as long as the mouse is held down, snapping back on release; the existing hover arrow-shift still works. With `prefers-reduced-motion: reduce` emulated, the scale-down still happens instantly (transitions are truncated to ~0ms by Task 2's global rule, not removed) — this is expected, since a press-scale is not a comprehension-relevant motion effect the apple-design reduced-motion guidance requires removing (it's feedback-on-press, kept even reduced, per the skill's "reduced motion doesn't mean no feedback").

- [ ] **Step 3: Commit**

```bash
git add components/ui/arrow-button.tsx
git commit -m "$(cat <<'EOF'
Add press feedback to ArrowButton

Respond on pointer-down per the apple-design skill's Response
principle: every ArrowButton variant now scales down slightly while
held, on top of the existing hover arrow-shift.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `CtaBreakoutBar` — gold pulse-glow

**Files:**
- Modify: `components/ui/cta-breakout-bar.tsx`

**Interfaces:**
- No signature change.

- [ ] **Step 1: Add the CTA-reserved gold pulse-glow**

In `components/ui/cta-breakout-bar.tsx`, the `Clipped` element's `className` (lines 26-29) currently reads:

```tsx
        className="flex items-center gap-6 bg-osi-gold-500 py-4 pr-6 pl-10 font-display text-sm tracking-wide-display text-osi-navy-900 uppercase transition-colors hover:bg-osi-gold-400"
```

Change to:

```tsx
        className="flex items-center gap-6 bg-osi-gold-500 py-4 pr-6 pl-10 font-display text-sm tracking-wide-display text-osi-navy-900 uppercase transition-colors hover:bg-osi-gold-400 motion-safe:animate-pulse-glow-gold"
```

This is the one place in the redesign gold glow is allowed to run continuously (not just on hover) — it's the site's single breakout CTA motif, meant to draw the eye, and it appears sparingly (once per section that uses it), so it stays inside the gold-scarcity guardrail.

- [ ] **Step 2: Verify**

Run: `pnpm build && pnpm lint && pnpm exec tsc --noEmit`
Expected: all succeed.

Run: `pnpm dev`, open `http://localhost:3000/styleguide`, scroll to "Breakout CTA bar".
Expected: the "Find a distributor" gold bar now has a soft, continuously pulsing gold glow around it; hovering still lightens the gold background as before. Emulate `prefers-reduced-motion: reduce` and confirm the pulsing stops (a static glow at one intensity, or none, is fine — the requirement is that it's no longer animating).

- [ ] **Step 3: Commit**

```bash
git add components/ui/cta-breakout-bar.tsx
git commit -m "$(cat <<'EOF'
Add gold pulse-glow to CtaBreakoutBar

The one intentional exception to gold-glow-on-hover-only: the
breakout CTA bar is the site's single highest-emphasis motif and
appears sparingly, so a continuous soft pulse stays within the
gold-scarcity guardrail while drawing the eye as designed.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `LabelPlateCard` — neutral layered hover glow

**Files:**
- Modify: `components/ui/label-plate-card.tsx`

**Interfaces:**
- No signature change.

- [ ] **Step 1: Add the neutral (non-gold) layered glow to the closed-card wrapper**

In `components/ui/label-plate-card.tsx`, the outer wrapper `<div>`'s `className` (line 59) currently reads:

```tsx
      className={`relative aspect-[3/4] overflow-hidden bg-osi-navy-700 ${className}`}
```

Change to:

```tsx
      className={`relative aspect-[3/4] overflow-hidden bg-osi-navy-700 transition-shadow duration-300 ${open ? "" : "hover:shadow-[0_0_0_1px_var(--color-osi-steel-500),0_8px_32px_color-mix(in_srgb,var(--color-osi-steel-500)_25%,transparent),0_0_60px_color-mix(in_srgb,var(--color-osi-steel-500)_10%,transparent)]"} ${className}`}
```

The three-layer shadow (hairline ring, mid bloom, wide ambient halo) is the Quattro §3 "canonical layered card glow" structure, using `osi-steel-500` instead of a brand accent to keep gold scarce. It's suppressed once the card is `open` (the open state already has its own gold "Learn more" bar as the visual emphasis — stacking a glow on top would compete with it).

- [ ] **Step 2: Verify**

Run: `pnpm build && pnpm lint && pnpm exec tsc --noEmit`
Expected: all succeed.

Run: `pnpm dev`, open `http://localhost:3000/styleguide`, scroll to "Label-plate card (one open per grid)".
Expected: hovering any of the three closed cards shows a soft steel-blue layered glow (a thin ring plus a soft bloom) around that card; the currently-open card (index 1, "ESP Chem Screen" per `LabelPlateDemo`'s `defaultOpenIndex={1}`) never shows the glow, hovered or not.

- [ ] **Step 3: Commit**

```bash
git add components/ui/label-plate-card.tsx
git commit -m "$(cat <<'EOF'
Add neutral layered hover glow to LabelPlateCard

Quattro's three-layer glow structure (hairline ring + mid bloom + wide
ambient halo), tinted osi-steel-500 rather than gold to keep gold
scarce. Suppressed on the already-open card, which has its own gold
emphasis bar.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: `TiltCard` primitive

**Files:**
- Create: `components/ui/tilt-card.tsx`
- Modify: `app/styleguide/page.tsx`

**Interfaces:**
- Consumes: `tiltSpringConfig` from `lib/motion/variants.ts` (Task 1).
- Produces: `TiltCard({ children, className }: { children: ReactNode; className?: string })` — a client component, importable by any later block/page that wraps a card in it.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { PointerEvent, ReactNode } from "react";
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
  const reduceMotion = useReducedMotion();
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
```

- [ ] **Step 2: Add a `/styleguide` demo**

In `app/styleguide/page.tsx`, add the import:

```tsx
import { TiltCard } from "@/components/ui/tilt-card";
```

And insert a new `<Section>` directly after the existing "Duotone image + clipped corners" section:

```tsx
      <Section bg="cream">
        <Heading>Tilt card</Heading>
        <TiltCard className="aspect-video max-w-sm rounded bg-osi-navy-700">
          <div className="flex h-full items-center justify-center font-display text-sm tracking-wide-display text-osi-white uppercase">
            Move your cursor over this card
          </div>
        </TiltCard>
      </Section>
```

- [ ] **Step 3: Verify**

Run: `pnpm build && pnpm lint && pnpm exec tsc --noEmit`
Expected: all succeed.

Run: `pnpm dev`, open `http://localhost:3000/styleguide`, scroll to "Tilt card".
Expected: moving the cursor across the navy box tilts it in 3D following the pointer, springing back to flat when the cursor leaves. With `prefers-reduced-motion: reduce` emulated, the box no longer tilts at all.

- [ ] **Step 4: Commit**

```bash
git add components/ui/tilt-card.tsx app/styleguide/page.tsx
git commit -m "$(cat <<'EOF'
Add TiltCard primitive

Cursor-follow 3D tilt wrapper, previewed on /styleguide. Not yet wired
into any real card — that happens per-block in the follow-up rollout
plan.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: `AnimatedSection` + `AnimatedGroup`/`AnimatedItem`, retire `ScrollReveal`

**Files:**
- Create: `components/ui/animated-section.tsx`
- Create: `components/ui/animated-group.tsx`
- Delete: `components/ui/scroll-reveal.tsx`
- Modify: `app/styleguide/page.tsx`

**Interfaces:**
- Consumes: `fadeRiseVariants`, `staggerContainerVariants` from `lib/motion/variants.ts` (Task 1).
- Produces: `AnimatedSection({ children, className }: { children: ReactNode; className?: string })`, `AnimatedGroup({ children, className }: { children: ReactNode; className?: string })`, `AnimatedItem({ children, className }: { children: ReactNode; className?: string })` — all client components, importable by any later block/page.

`ScrollReveal` (the IntersectionObserver-driven predecessor) is deleted in this task since its only consumer anywhere in the codebase is `/styleguide`, which this task updates to use the replacements instead — no dangling imports are left behind.

- [ ] **Step 1: Create `AnimatedSection`**

```tsx
"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { fadeRiseVariants } from "@/lib/motion/variants";

/**
 * Restrained, mechanical scroll-in: fade + 8px rise, once, 400ms.
 * Drop-in successor to the old CSS-only ScrollReveal — same feel,
 * Motion-driven so AnimatedGroup/AnimatedItem (animated-group.tsx) can
 * stagger several of these together.
 */
export function AnimatedSection({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={reduceMotion ? undefined : fadeRiseVariants}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: Create `AnimatedGroup` + `AnimatedItem`**

```tsx
"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { fadeRiseVariants, staggerContainerVariants } from "@/lib/motion/variants";

/**
 * Stagger-aware pair for grids: wrap the grid in <AnimatedGroup>, each
 * child in <AnimatedItem> — children fade+rise in sequence as the group
 * enters the viewport, once.
 */
export function AnimatedGroup({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={reduceMotion ? undefined : staggerContainerVariants}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div className={className} variants={reduceMotion ? undefined : fadeRiseVariants}>
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 3: Delete `ScrollReveal` and update its one consumer**

Delete `components/ui/scroll-reveal.tsx`.

In `app/styleguide/page.tsx`, remove the import:

```tsx
import { ScrollReveal } from "@/components/ui/scroll-reveal";
```

and add in its place:

```tsx
import { AnimatedSection } from "@/components/ui/animated-section";
import { AnimatedGroup, AnimatedItem } from "@/components/ui/animated-group";
```

Then replace the whole "Scroll reveal" section (the last `<Section>` in the file) with:

```tsx
      <Section bg="navy">
        <Heading>Scroll reveal</Heading>
        <AnimatedSection>
          <p className="max-w-md text-osi-slate-200">
            Scroll this card out of view and back — it fades and rises once, 400ms, and is inert
            under prefers-reduced-motion.
          </p>
        </AnimatedSection>
        <AnimatedGroup className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {["One", "Two", "Three"].map((label) => (
            <AnimatedItem key={label} className="rounded bg-osi-steel-500/20 p-6">
              <p className="font-display text-sm tracking-wide-display text-osi-white uppercase">
                {label}
              </p>
            </AnimatedItem>
          ))}
        </AnimatedGroup>
      </Section>
```

- [ ] **Step 4: Verify**

Run: `pnpm build && pnpm lint && pnpm exec tsc --noEmit`
Expected: all succeed — no references to the deleted `scroll-reveal.tsx` remain anywhere (confirm with `grep -r "scroll-reveal" app components lib`, expect no output).

Run: `pnpm dev`, open `http://localhost:3000/styleguide`, scroll to "Scroll reveal".
Expected: the single paragraph fades+rises once when it enters the viewport (same feel as before); below it, three boxes ("One", "Two", "Three") fade+rise in a staggered left-to-right sequence together. Scrolling back up and down again does not replay either animation (`once: true`). With `prefers-reduced-motion: reduce` emulated, everything is visible immediately with no motion.

- [ ] **Step 5: Commit**

```bash
git add components/ui/animated-section.tsx components/ui/animated-group.tsx app/styleguide/page.tsx
git rm components/ui/scroll-reveal.tsx
git commit -m "$(cat <<'EOF'
Replace ScrollReveal with AnimatedSection/AnimatedGroup/AnimatedItem

Motion-driven successors to the CSS-only ScrollReveal (same fade+rise
feel), adding a stagger-capable pair for grids. ScrollReveal's only
consumer was /styleguide, now updated to the replacements, so the old
component is removed rather than left running in parallel.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: `GradientText` primitive

**Files:**
- Create: `components/ui/gradient-text.tsx`
- Modify: `app/styleguide/page.tsx`

**Interfaces:**
- Consumes: the `animate-gradient-shift` Tailwind utility (Task 2).
- Produces: `GradientText({ children, className }: { children: ReactNode; className?: string })`.

- [ ] **Step 1: Create the component**

```tsx
import type { ReactNode } from "react";

/**
 * Gold gradient-sweep text — navy backgrounds only. gold-500/gold-400
 * both clear WCAG AA on navy (see app/globals.css's color-token
 * comments); there is no equivalent light-safe pair for a cream
 * background, so this primitive is not used there — use a solid
 * gold-700 label instead. Used sparingly: a single eyebrow/kicker or
 * one hero word, never a full heading (gold is a scarce, load-bearing
 * accent, never body text — CLAUDE.md).
 */
export function GradientText({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-block bg-size-[200%_auto] bg-clip-text text-transparent motion-safe:animate-gradient-shift [background-image:linear-gradient(90deg,var(--color-osi-gold-500),var(--color-osi-gold-400),var(--color-osi-gold-500))] ${className}`}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 2: Add a `/styleguide` demo**

In `app/styleguide/page.tsx`, add the import:

```tsx
import { GradientText } from "@/components/ui/gradient-text";
```

And insert a new `<Section>` directly after the "Motion foundation" section added in Task 2:

```tsx
      <Section bg="navy" className="pt-0 pb-24">
        <p className="mb-2 font-display text-small-label tracking-wide-label uppercase">
          <GradientText>Gradient text</GradientText>
        </p>
        <p className="max-w-md text-osi-slate-200">
          Reserved for a single eyebrow/kicker or one hero word — navy backgrounds only.
        </p>
      </Section>
```

- [ ] **Step 3: Verify**

Run: `pnpm build && pnpm lint && pnpm exec tsc --noEmit`
Expected: all succeed.

Run: `pnpm dev`, open `http://localhost:3000/styleguide`.
Expected: directly below "Motion foundation", a small uppercase label reading "Gradient text" sweeps a gold gradient across itself continuously. Emulate `prefers-reduced-motion: reduce` and confirm the sweep stops (text stays legibly gold, just static).

- [ ] **Step 4: Commit**

```bash
git add components/ui/gradient-text.tsx app/styleguide/page.tsx
git commit -m "$(cat <<'EOF'
Add GradientText primitive

Gold gradient-sweep span, restricted to navy backgrounds (the only
context with a WCAG-safe two-stop gold pair), previewed on
/styleguide.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: `MarqueeStrip` primitive, wired into the `logo_strip` block

**Files:**
- Create: `components/ui/marquee-strip.tsx`
- Modify: `components/blocks/logo-strip.tsx`
- Modify: `app/styleguide/page.tsx`

**Interfaces:**
- Consumes: the `animate-marquee` Tailwind utility (Task 2).
- Produces: `MarqueeStrip({ children, className }: { children: ReactNode; className?: string })`.

- [ ] **Step 1: Create the component**

```tsx
import type { ReactNode } from "react";

/**
 * Infinite horizontal scroll (Quattro §1) — CSS-only. The track renders
 * its children twice back-to-back (animate-marquee's translateX(-50%)
 * assumes exactly two copies) so the loop has no visible seam. Under
 * prefers-reduced-motion, the animation stops (site-wide rule) and the
 * duplicate copy is hidden so it reads as one static row, not a
 * doubled-up list.
 */
export function MarqueeStrip({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="flex w-max items-center gap-10 motion-safe:animate-marquee">
        <div className="flex items-center gap-10">{children}</div>
        <div className="flex items-center gap-10 motion-reduce:hidden" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into the `logo_strip` block**

In `components/blocks/logo-strip.tsx`, add the import:

```tsx
import { MarqueeStrip } from "@/components/ui/marquee-strip";
```

Replace the `Render` function's logo-row `<div>` (the `flex flex-wrap items-center justify-center gap-10 opacity-80 grayscale` block) with:

```tsx
      <MarqueeStrip className="opacity-80 grayscale">
        {data.logos.map((logo) =>
          logo.imageUrl ? (
            <Image
              key={logo.name}
              src={logo.imageUrl}
              alt={logo.name}
              width={120}
              height={48}
              className="shrink-0"
            />
          ) : (
            <span
              key={logo.name}
              className="shrink-0 font-display text-sm tracking-wide-display uppercase"
            >
              {logo.name}
            </span>
          ),
        )}
      </MarqueeStrip>
```

- [ ] **Step 3: Add a `/styleguide` demo**

In `app/styleguide/page.tsx`, add the import:

```tsx
import { MarqueeStrip } from "@/components/ui/marquee-strip";
```

And insert a new `<Section>` directly after the "Tilt card" section added in Task 6:

```tsx
      <Section bg="cream">
        <Heading>Marquee</Heading>
        <MarqueeStrip>
          {["Alpha Corp", "Beta Industries", "Gamma Energy", "Delta Field Services"].map((name) => (
            <span key={name} className="shrink-0 font-display text-sm tracking-wide-display uppercase">
              {name}
            </span>
          ))}
        </MarqueeStrip>
      </Section>
```

- [ ] **Step 4: Verify**

Run: `pnpm build && pnpm lint && pnpm exec tsc --noEmit`
Expected: all succeed (this exercises the `logo_strip` block's Zod schema/`Render` unchanged, only the JSX inside changed).

Run: `pnpm dev`, open `http://localhost:3000/styleguide`, scroll to "Marquee".
Expected: the four sample names scroll continuously leftward in a seamless loop. Emulate `prefers-reduced-motion: reduce` and confirm the row goes static, showing each name exactly once (not doubled).

- [ ] **Step 5: Commit**

```bash
git add components/ui/marquee-strip.tsx components/blocks/logo-strip.tsx app/styleguide/page.tsx
git commit -m "$(cat <<'EOF'
Add MarqueeStrip primitive, wire into the logo_strip block

CSS-only infinite scroll, previewed on /styleguide and wired into the
one real content case that fits it (the logo_strip CMS block).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Header/Footer motion — sliding nav underline, press feedback, link transitions

**Files:**
- Modify: `components/layout/mega-menu-client.tsx`
- Modify: `components/layout/footer.tsx`

**Interfaces:**
- No exported signatures change for either component.

- [ ] **Step 1: Add a hover-tracked, spring-driven sliding underline to the utility nav links**

In `components/layout/mega-menu-client.tsx`, add to the imports:

```tsx
import { motion, useReducedMotion } from "motion/react";
import { springTransition } from "@/lib/motion/variants";
```

and, inside the `MegaMenuClient` component, add state for the hovered item near the existing `useState`/`useRef` declarations:

```tsx
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
```

Replace the utility `<nav>` block:

```tsx
        <nav className="hidden items-center gap-6 lg:flex" aria-label="Utility">
          {utilityItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="font-display text-xs tracking-wide-display uppercase opacity-80 hover:opacity-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
```

with:

```tsx
        <nav
          className="hidden items-center gap-6 lg:flex"
          aria-label="Utility"
          onMouseLeave={() => setHoveredId(null)}
        >
          {utilityItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              onMouseEnter={() => setHoveredId(item.id)}
              onFocus={() => setHoveredId(item.id)}
              onBlur={() => setHoveredId(null)}
              className="relative font-display text-xs tracking-wide-display uppercase opacity-80 hover:opacity-100"
            >
              {item.label}
              {hoveredId === item.id && (
                <motion.span
                  layoutId="utility-nav-underline"
                  className="absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-osi-gold-500"
                  transition={reduceMotion ? { duration: 0 } : springTransition}
                />
              )}
            </Link>
          ))}
        </nav>
```

(Gold is already used for small UI accents in this exact file — the mega-menu column headings and badges — so a gold underline indicator is consistent with existing precedent, not a new gold surface.)

- [ ] **Step 2: Add press feedback to the "Menu" trigger button**

In the same file, the trigger `<button>`'s `className` currently reads:

```tsx
          className="font-display text-sm tracking-wide-display uppercase"
```

Change to:

```tsx
          className="font-display text-sm tracking-wide-display uppercase transition-transform duration-200 active:scale-[0.97]"
```

- [ ] **Step 3: Add missing hover transitions in the Footer**

In `components/layout/footer.tsx`, the footer-column link `className` currently reads:

```tsx
                  <Link href={item.href} className="text-sm opacity-80 hover:opacity-100">
```

Change to:

```tsx
                  <Link href={item.href} className="text-sm opacity-80 transition-opacity duration-200 hover:opacity-100">
```

And the social-icon `className` currently reads:

```tsx
                className="flex h-9 w-9 items-center justify-center rounded-full border border-current text-xs"
```

Change to:

```tsx
                className="flex h-9 w-9 items-center justify-center rounded-full border border-current text-xs transition-opacity duration-200 hover:opacity-80"
```

- [ ] **Step 4: Verify**

Run: `pnpm build && pnpm lint && pnpm exec tsc --noEmit`
Expected: all succeed.

Run: `pnpm dev`, open `http://localhost:3000/` (home — Header/Footer wrap every `(site)` route).
Expected: at desktop width (`lg:` breakpoint or wider), hovering between the utility nav links (top-right of the header) slides a thin gold underline smoothly from one link to the next rather than it appearing/disappearing abruptly; pressing and holding the "Menu" button shrinks it slightly; in the footer, hovering the column links and the circular social-icon buttons now fades smoothly instead of snapping. With `prefers-reduced-motion: reduce` emulated, the underline still moves but instantly (no spring slide) rather than not appearing at all.

- [ ] **Step 5: Commit**

```bash
git add components/layout/mega-menu-client.tsx components/layout/footer.tsx
git commit -m "$(cat <<'EOF'
Add sliding nav underline and hover/press polish to Header and Footer

Shared-layoutId underline slides between utility nav links on
hover/focus (Framer Motion); Menu button gets press feedback; Footer's
link/social-icon hovers get the transition classes they were missing.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full clean build**

Run: `pnpm build && pnpm lint && pnpm exec tsc --noEmit`
Expected: all three succeed with zero errors/warnings.

- [ ] **Step 2: Lighthouse re-verification**

Run:
```bash
lsof -ti:3000 | xargs kill -9 2>/dev/null
pnpm build && pnpm start &
sleep 5
lighthouse http://localhost:3000/ --output=json --output-path=/tmp/lh-home.json --chrome-flags="--headless"
lighthouse http://localhost:3000/products/gas-lift/gas-release-system --output=json --output-path=/tmp/lh-product.json --chrome-flags="--headless"
```
(Confirm the real product detail slug via `lib/data/products.ts`/the seed script if the one above doesn't resolve — Phase 7 already established home + product detail as the two Lighthouse targets.)

Expected: Performance/Accessibility/Best-Practices/SEO scores on both pages are still ≥ 90 (Phase 7 baseline was 100/9x/100/100) — no regression from the new motion. If Performance dropped, check whether it's the continuous `animate-pulse-glow-gold`/`animate-float`/`animate-gradient-shift` loops causing excess repaint on a page that renders many of them at once, and scope their usage down before moving on.

- [ ] **Step 3: Reduced-motion manual pass**

Run: `pnpm dev`, open `http://localhost:3000/styleguide` and `http://localhost:3000/` in a browser with devtools open.
Expected, with `prefers-reduced-motion: reduce` emulated (Rendering tab → Emulate CSS media feature) across both pages: no element loops, bobs, pulses, slides, tilts, or sweeps continuously; text and interactive elements remain fully legible and operable; nothing that previously conveyed information (e.g. the scroll-reveal content) is hidden or inaccessible — it simply appears without motion.

- [ ] **Step 4: Confirm no stray gold usage**

Run: `git diff main --stat` (or the equivalent range covering this plan's commits) to list every file this plan touched, then `grep -n "gold" <each touched file>`.
Expected: gold-tinted classes/values appear only in `cta-breakout-bar.tsx` (Task 4, the sanctioned continuous glow), `mega-menu-client.tsx` (the nav underline, consistent with that file's pre-existing gold usage), and `gradient-text.tsx` (Task 8, explicitly the gold-gradient primitive) — nowhere else.

- [ ] **Step 5: No commit for this task**

This is a verification-only task — nothing to add/commit. If any check above fails, fix it within the task whose file caused the regression (amend that task's own commit range as a new follow-up commit, per this repo's "always a new commit, never amend a published commit" convention) rather than bundling a fix here.

---

## Out of scope for this plan (follow-up work)

Per the design spec's phased rollout, this plan covers Phases 1-3 (Foundation, Shared chrome, Primitives). Phases 4-8 — wiring these now-proven primitives into Home/Products/Contact's `BlockRenderer` pipeline, the remaining ~24 block types, the product detail page's directly-composed renders, and admin's light interaction polish — are mechanical repetitions of the same recipe established here, and get their own follow-up plan(s) once this one lands and is reviewed on the live site.
