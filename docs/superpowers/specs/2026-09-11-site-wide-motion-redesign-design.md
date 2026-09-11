# Site-wide motion & fluidity redesign

## Problem

The site (Next.js App Router + Supabase CMS, replacing odessaseparator.com)
currently reads as static/dated: one easing token (`--ease-osi`) and one
animation utility (`reveal-init`/`reveal-in`, driven by `ScrollReveal`) exist
in the whole codebase; everything else is either unanimated or has a bare
`transition-colors`. The six signature motifs from the design system (angled
corner clips, circled-arrow buttons, hairline grid overlay, label-plate
cards, duotone photography, gold breakout CTA bar) are all implemented as
static CSS/clip-path today except the arrow button's existing hover shift.
Goal: add movement and fluidity across the whole public site (and light
polish to the admin CMS) without regressing design fidelity, performance
(Lighthouse ≥ 90, already verified 100/9x/100/100 on home + product detail),
or accessibility (WCAG AA contrast, focus-visible, reduced motion).

## Inputs

- `quattro-motion-shape-guide.md` — color-agnostic animation/shape/spacing
  patterns ported from a prior project (Quattro): five keyframe animations
  (`gradient-shift`, `float`, `pulse-glow`, `marquee`, `spin-slow`), a
  layered glow-shadow structure, semantic border-radius tiers, and shape
  patterns for buttons/cards/navbar. Used as a **structural** reference
  (timing, easing, shadow layering, radius discipline) — per user decision,
  also open to adopting some of its visual patterns themselves (glow cards,
  gradient text), not just timing.
- `apple-design` skill (WWDC *Designing Fluid Interfaces* / *Principles of
  Great Design*, translated for web) — response/interruptibility/spring
  behavior, materials & depth, typography rhythm, reduced-motion handling,
  and the restraint principles (purpose, simplicity, craft) that argue
  against animating purely decorative elements. Most of the gesture/drag
  material (velocity handoff, rubber-banding, 1:1 pointer tracking) doesn't
  apply — this site has no drag-driven UI — so it's used for its entrance/
  hover/spring-tuning and accessibility guidance, not the gesture mechanics.

## Non-negotiable constraints (from `CLAUDE.md`)

1. The mockup (`docs/design/OSI Mock-Up 9-3-2026.pdf`) remains the visual
   spec. This work adds motion to the existing visual language — it does
   not introduce a new one. Where the Quattro guide's visual patterns
   (glow, gradient text) are adopted, they must express through OSI's
   existing navy/cream/gold/steel tokens, not new colors.
1a. **Gold stays scarce** (explicit product decision, this spec) — gold
   glow/shadow is reserved for primary CTAs (`ArrowButton` primary variant,
   `CtaBreakoutBar`). Every other glow/hover treatment uses a neutral
   navy/`osi-steel-500` variant. This preserves gold's existing
   "load-bearing accent only, never body text" role.
2. Minimal footprint / no unexplained dependencies — this spec adds exactly
   one new dependency, `motion` (Framer Motion), used **sparingly**: hover
   tilt-cards, staggered scroll-reveal, and the sliding nav-underline.
   Everything else (hovers, glows, gradients, marquee, keyframes) is
   CSS-only, extending the existing `@theme` token approach.
3. English-only UI/code/docs, no stray `.md` files — this document lives at
   the sanctioned `docs/superpowers/specs/` path for the brainstorming
   process; no other new doc files are created by this work except updates
   to already-existing docs (`CLAUDE.md`, `docs/CLIENT-HANDBOOK.md` only if
   an admin-facing control's behavior changes).
4. Phase discipline — `pnpm build`, `pnpm lint`, `pnpm exec tsc --noEmit`
   clean at the end of each phase below.

## Design

### 1. Foundation layer

- Extend `app/globals.css`'s `@theme` block with a small named
  duration scale (fast ~150–200ms for buttons/links, medium ~300ms for
  cards/sections), reusing the existing `--ease-osi` curve as the default
  — no second easing curve invented.
- Add the Quattro keyframes as literal `@keyframes` (`float`,
  `gradient-shift`, `marquee`, `spin-slow`) plus Tailwind v4 `--animate-*`
  theme entries, so they're usable as utilities (`animate-float`, etc.) —
  same mechanism already used for existing design tokens.
- `pulse-glow` ships in two variants per the gold-scarcity rule: a
  `osi-gold-500`-based one (CTA-only) and a neutral `osi-steel-500`/navy
  one (default for everything else).
- New `lib/motion/variants.ts`: shared Framer Motion variant objects
  (fade+rise scroll-reveal, stagger container/item, tilt spring config) —
  single source of tuned constants. Springs default to critically damped
  (`damping 1.0`-equivalent, no overshoot) per apple-design; bounce is not
  used anywhere in this site since no interaction here is momentum/gesture
  driven.
- Global `prefers-reduced-motion` strategy, promoted from the current
  reveal-only override (`globals.css:130-138`) to a site-wide rule:
  transform-based motion disabled, opacity-only cross-fades retained.
  Framer Motion components additionally check `useReducedMotion()`
  in-component — the CSS media query alone doesn't cover JS-driven motion.

### 2. New/extended `components/ui/` primitives

New files (one primitive per file, matching the existing six-motif
pattern):
- `tilt-card.tsx` — cursor-follow 3D tilt wrapper (client component),
  wraps `LabelPlateCard`/product cards where used in grids.
- `animated-section.tsx` / `animated-item.tsx` — stagger-aware
  successor pair to standalone `ScrollReveal`, same IntersectionObserver
  approach, Motion-driven so grid children stagger in.
- `marquee-strip.tsx` — CSS-only (`animate-marquee`); only wired in if a
  real content case exists (e.g. a logo/partner strip) — not forced.
- `gradient-text.tsx` — gradient-sweep span, used sparingly (eyebrow/
  kicker or a single hero word, never a full heading) to stay inside the
  gold-scarcity spirit.

Extended (motion added in place, no new files):
- `arrow-button.tsx` — adds `active:scale-[0.97]` press feedback
  (apple-design "respond on pointer-down") on top of its existing hover
  arrow shift.
- `cta-breakout-bar.tsx` — gold `pulse-glow` (CTA-reserved variant).
- `label-plate-card.tsx` — neutral layered glow-on-hover (Quattro §3B
  structure: hairline ring + mid bloom + wide ambient halo, steel/navy
  tinted), optionally wrapped in `tilt-card.tsx`.
- `clipped.tsx`, `hairline-grid.tsx`, `duotone-image.tsx` stay
  structurally static — decorative/background elements, animating them
  would violate the apple-design restraint principle (purpose, simplicity)
  for no functional gain. `duotone-image.tsx` gets a `transition` on its
  overlay opacity only where the image is itself an interactive link.
- Header — sliding nav-underline (Framer Motion shared-layout `layoutId`)
  replacing static active-state styling; scroll-state translucency
  (`backdrop-filter` blur) on the nav bar. Exact current implementation to
  be confirmed against the live `Header`/mega-menu code at implementation
  time rather than assumed here.

Preview surface: every new/extended primitive is exercised on
`/app/styleguide` (the existing design-system reference page) before being
wired into real pages/blocks.

### 3. Rollout phases

1. Foundation (tokens/keyframes/`lib/motion/variants.ts`/reduced-motion).
2. Shared chrome — Header (underline, scroll translucency), Footer.
3. Primitives — build/extend `components/ui/*`, verified on `/styleguide`.
4. Home + Products listing + Contact (`pages`/`page_blocks`/`BlockRenderer`
   pipeline — motion lands once per block type, live everywhere that block
   type is used).
5. Remaining ~26 block types in `components/blocks/`. Client-boundary
   blocks (`stages-carousel`, `contact-form`, `video-embed`) keep motion
   logic in their existing `*-client.tsx` file, never in the schema/
   `defineBlock` file — the established split-file gotcha in `CLAUDE.md`.
6. Product detail page (`ProductHeroRender`, `BenefitsCardsRender`, etc.,
   composed directly in `app/(site)/products/[category]/[slug]/page.tsx`)
   — same primitives, applied at the call sites.
7. Generic migrated `[...slug]` pages — inherit automatically from steps
   5–6, no separate work.
8. Admin light polish — `field-renderer.tsx`/`block-fields-form.tsx`
   interaction states (button press feedback, focus/save transitions),
   media-picker dialog open/close transition. Explicitly stops at
   interaction-level — no decorative motifs (clip-path/duotone/hairline
   grid) introduced into admin, matching its existing lighter/unbranded
   shape treatment.

### 4. Guardrails (checked continuously, not a separate phase)

- Gold-glow usage is grepped and reviewed every phase — CTA-only.
- Lighthouse re-verified (`pnpm build && pnpm start` + `lighthouse` CLI,
  killing port 3000 via `lsof -ti:3000 | xargs kill -9` per the documented
  gotcha) after the foundation phase and again after full rollout — not
  just once at the end.
- Reduced motion verified per-component (JS + CSS), not just globally.
- `:focus-visible` outline never replaced with `focus:outline-none`
  without an equally visible substitute.
- Exactly one new dependency (`motion`); nothing else added.

### 5. Testing/verification

- `pnpm build`, `pnpm lint`, `pnpm exec tsc --noEmit` clean at the end of
  each phase.
- Manual Playwright pass per phase for hover/press/focus states.
- Lighthouse re-verification per guardrails above.
- `prefers-reduced-motion` manually toggled in devtools during the
  Playwright pass.
- `docs/CLIENT-HANDBOOK.md` updated only if an admin-facing control's
  behavior changes (not expected, since this is visual/motion only).

## Out of scope

- Any new visual color/shape language beyond what's described above (no
  new accent colors, no departure from the mockup).
- Gesture-driven interactions (drag, swipe, 1:1 pointer tracking,
  rubber-banding) — nothing in this site's current UI needs them, so the
  gesture-mechanics half of apple-design is not implemented here.
- Decorative motion on admin's structural chrome.
- A second easing curve or animation library beyond `motion`.
