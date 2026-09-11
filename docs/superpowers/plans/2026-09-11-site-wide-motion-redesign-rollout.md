# Site-wide motion redesign — Block rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the motion primitives built in the foundation plan into every public CMS block, the product detail page, and the admin UI, completing the spec's phases 4–8.

**Architecture:** Scroll-reveal is delivered once, centrally, by giving `components/ui/section.tsx` a `reveal` prop — every block already wraps itself in `<Section>`, so ~20 blocks get the entrance animation from a single edit rather than 20 hand-edits. The motion element is the `<section>` element itself (via a small client component), never an inner wrapper, because a transformed wrapper becomes the containing block for `position: absolute` children and would silently re-anchor hero background images, `CtaBreakoutBar` overhangs, and `HairlineGrid` overlays. Blocks that need richer motion (staggered grids) opt out of the section-level reveal and drive their own. Heroes opt out to protect LCP.

**Tech Stack:** Next.js 16 (App Router, TS strict), Tailwind v4, `motion` (Framer Motion) — all already installed.

**Spec:** `docs/superpowers/specs/2026-09-11-site-wide-motion-redesign-design.md`
**Predecessor plan (already landed on `main`):** `docs/superpowers/plans/2026-09-11-site-wide-motion-redesign-foundation.md`

## Global Constraints

- **Gold stays scarce.** Gold glow/gradient is reserved for primary CTAs (`ArrowButton` primary variant, `CtaBreakoutBar`) and `GradientText` on navy hero eyebrows. Every other accent/glow uses neutral `osi-steel-500`. Grep each task's diff for `gold` before calling it done.
- **No new dependencies.** `motion` is the only animation library; nothing else gets added.
- **No second easing curve.** Reuse `--ease-osi` in CSS and `EASE_OSI` / `springTransition` / `fadeRiseVariants` / `staggerContainerVariants` from `lib/motion/variants.ts`.
- **Reduced motion is mandatory.** Every Framer Motion component checks `useReducedMotion()` in-component; every CSS keyframe utility is used with a `motion-safe:` prefix at its call site.
- **A block either uses section-level reveal OR its own stagger — never both.** A block that wraps its grid in `AnimatedGroup` must pass `reveal={false}` to its `<Section>`.
- **Never introduce a transformed wrapper around absolutely-positioned children.** If a block has an `absolute` descendant inside the section content (hero background, breakout bar, hairline grid overlay), the animated element must be the element that was already its containing block, or the block opts out.
- **`clip-path` clips `box-shadow`.** A `Clipped` component or `clip-notch-*` utility cannot show an outer glow — use border/background hover transitions on those, or move the glow to an unclipped parent.
- `:focus-visible` (`app/globals.css`) is never overridden with `focus:outline-none` without an equally visible replacement.
- `pnpm build`, `pnpm lint`, `pnpm exec tsc --noEmit` clean at the end of every task.
- English only in code/comments/docs.

---

### Task 1: Section-level scroll reveal

**Files:**
- Create: `components/ui/reveal-section.tsx`
- Modify: `components/ui/section.tsx`
- Modify: `components/blocks/hero-full.tsx`, `components/blocks/hero-page.tsx`, `components/blocks/product-hero.tsx`, `components/blocks/contact-form-client.tsx` (opt-outs only)

**Interfaces:**
- Consumes: `fadeRiseVariants` from `lib/motion/variants.ts`.
- Produces: `RevealSection({ id, className, children })`, and a new `reveal?: boolean` prop on `Section` (default `true`). Every later task relies on `reveal={false}` being available.

- [ ] **Step 1: Create `components/ui/reveal-section.tsx`**

```tsx
"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { fadeRiseVariants } from "@/lib/motion/variants";

/**
 * Scroll-reveal for a whole <section>. The motion element IS the
 * <section>, never an inner wrapper: a transformed wrapper becomes the
 * containing block for absolutely-positioned descendants, which would
 * silently re-anchor the hero background images, CtaBreakoutBar's
 * overhang, and HairlineGrid overlays that several blocks rely on.
 * Section is already `relative`, so it is that containing block either
 * way — animating it changes nothing about where those children sit.
 */
export function RevealSection({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      id={id}
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={reduceMotion ? undefined : fadeRiseVariants}
    >
      {children}
    </motion.section>
  );
}
```

- [ ] **Step 2: Give `Section` the `reveal` prop**

In `components/ui/section.tsx`, add the import:

```tsx
import { RevealSection } from "./reveal-section";
```

Add `reveal = true,` to the destructured props (directly after `anchorId,`) and `reveal?: boolean;` to the props type (directly after `anchorId?: string;`).

Then replace the final `return (...)` block:

```tsx
  return (
    <section
      id={anchorId}
      className={`relative overflow-visible ${bgClass} ${seamClass} ${paddingTop} ${paddingBottom} ${className}`}
    >
      <div className={contentClassName}>{children}</div>
    </section>
  );
```

with:

```tsx
  const sectionClassName = `relative overflow-visible ${bgClass} ${seamClass} ${paddingTop} ${paddingBottom} ${className}`;
  const content = <div className={contentClassName}>{children}</div>;

  // Blocks that drive their own entrance motion (staggered grids) or that
  // must paint immediately (heroes — an opacity-0 start delays LCP) pass
  // reveal={false} and render as a plain server-rendered <section>.
  if (!reveal) {
    return (
      <section id={anchorId} className={sectionClassName}>
        {content}
      </section>
    );
  }

  return (
    <RevealSection id={anchorId} className={sectionClassName}>
      {content}
    </RevealSection>
  );
```

- [ ] **Step 3: Opt the heroes and the contact form out**

Add `reveal={false}` to the `<Section` opening tag (alongside the existing `background=`/`anchorId=` props) in each of these four files:
- `components/blocks/hero-full.tsx` — LCP: the hero headline/background is the largest contentful element on the home page.
- `components/blocks/hero-page.tsx` — same reason.
- `components/blocks/product-hero.tsx` — same reason, and it is the LCP element on the product-detail Lighthouse target.
- `components/blocks/contact-form-client.tsx` — form fields should not move; the section holds live inputs and a `useActionState` pending state.

- [ ] **Step 4: Verify**

Run: `pnpm build && pnpm lint && pnpm exec tsc --noEmit`
Expected: all three succeed.

Run: `pnpm dev`, open `http://localhost:3000/` in a browser.
Expected: the hero renders immediately with no fade (it opted out), and each section below it fades+rises once as you scroll it into view. Scrolling back up and down does not replay. Open `http://localhost:3000/contact` and confirm the contact form section does not animate. Emulate `prefers-reduced-motion: reduce` in devtools (Rendering tab → Emulate CSS media feature) and confirm every section is simply visible with no motion.

Critically, also confirm nothing moved: on the home page the hero's full-bleed background image still covers the hero (not shifted or mis-sized), and any gold breakout CTA bar still overhangs its section edge exactly as before. If either looks re-anchored, the animated element is wrapping rather than being the section — re-read Step 1's comment.

- [ ] **Step 5: Commit**

```bash
git add components/ui/reveal-section.tsx components/ui/section.tsx components/blocks/hero-full.tsx components/blocks/hero-page.tsx components/blocks/product-hero.tsx components/blocks/contact-form-client.tsx
git commit -m "$(cat <<'EOF'
Add section-level scroll reveal

Every block already wraps itself in <Section>, so the entrance
animation lands in one place instead of ~20 hand-edits. The motion
element is the <section> itself — a transformed wrapper would become
the containing block for the absolutely-positioned hero backgrounds,
breakout bars and grid overlays and re-anchor them. Heroes opt out to
protect LCP; the contact form opts out so live inputs stay still.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Staggered grids

**Files:**
- Modify: `components/blocks/benefits-cards.tsx`, `components/blocks/news-feed.tsx`, `components/blocks/image-gallery.tsx`, `components/blocks/mission-cards.tsx`, `components/blocks/stat-grid.tsx`, `components/blocks/team-directory.tsx`, `components/blocks/link-columns.tsx`

**Interfaces:**
- Consumes: `AnimatedGroup`, `AnimatedItem` from `components/ui/animated-group.tsx`; the `reveal` prop from Task 1.

This is one batched task: the same two-part edit applied to seven files.

- [ ] **Step 1: Apply the stagger pattern to each file**

The pattern, in every file:

1. Add the import: `import { AnimatedGroup, AnimatedItem } from "@/components/ui/animated-group";`
2. Add `reveal={false}` to the `<Section` opening tag (the block drives its own entrance now — per the Global Constraints, never both).
3. Change the grid container `<div className="grid …">` into `<AnimatedGroup className="grid …">` — keep the className byte-for-byte identical, only the element changes (`AnimatedGroup` renders a `div` and forwards `className`). Close it with `</AnimatedGroup>`.
4. Wrap each mapped child in `<AnimatedItem>`, moving the existing `key` onto the `AnimatedItem` (React needs the key on the outermost element of the map).

Worked example — `components/blocks/benefits-cards.tsx`, whose grid is at line 28:

```tsx
      <AnimatedGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.items.map((item) => (
          <AnimatedItem key={item.title}>
            <Clipped
              corner="br"
              size="1.25rem"
              className="border border-osi-steel-500/30 bg-osi-navy-600/40 p-6"
            >
              <h3 className="font-display text-sm tracking-wide-display uppercase">{item.title}</h3>
              {item.body && <p className="mt-2 text-sm opacity-80">{item.body}</p>}
            </Clipped>
          </AnimatedItem>
        ))}
      </AnimatedGroup>
```

The remaining six, with the exact grid container to convert:

| File | Grid container line (as it reads today) | Item to wrap |
|---|---|---|
| `news-feed.tsx:69` | `<div className="grid grid-cols-1 gap-6 sm:grid-cols-3">` | each `rest.map((post) => …)` child |
| `image-gallery.tsx:30` | `<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">` | each `data.images.map((image, i) => …)` child |
| `mission-cards.tsx:29` | ``<div className={`grid grid-cols-1 gap-6 ${cols}`}>`` | each `data.cards.map((card) => …)` child |
| `stat-grid.tsx:57` | ``<div className={`relative grid grid-cols-1 gap-px ${cols}`}>`` | each `data.stats.map((stat) => …)` child — **leave the `<HairlineGrid …/>` sibling as a direct, unwrapped child of the AnimatedGroup**; it is a decorative absolutely-positioned overlay, not a grid cell, and wrapping it would animate it out of place |
| `team-directory.tsx:47` | `<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">` (the inner per-department people grid, **not** the outer group list at line 42) | each `people.map((person) => …)` child |
| `link-columns.tsx:33` | ``<div className={`grid grid-cols-1 gap-8 ${COLS_CLASS[data.columns.length] ?? ""}`}>`` | each `data.columns.map((col, i) => …)` child |

Watch-out: if a mapped child relied on being a direct grid cell for full-height stretching (e.g. it carries `h-full`), the new `AnimatedItem` is now the grid cell — give the `AnimatedItem` the same `className="h-full"` so the layout is unchanged. Check each file's rendered result in Step 2 rather than assuming.

- [ ] **Step 2: Verify**

Run: `pnpm build && pnpm lint && pnpm exec tsc --noEmit`
Expected: all three succeed.

Run: `pnpm dev` and view each affected block. The quickest coverage: `http://localhost:3000/` (home — check whichever of these blocks the seeded home page uses) and `http://localhost:3000/products/gas-separation/gas-release-system` (product detail — renders `benefits_cards`).
Expected: when each grid scrolls into view, its cards/tiles fade+rise in sequence (roughly 80ms apart) rather than all at once; the grid layout itself (column counts, gaps, alignment, any full-height stretching) is pixel-identical to before. On `stat-grid`, the hairline grid overlay still sits behind the stat cells and spans the full width as before. With `prefers-reduced-motion: reduce` emulated, every item is simply visible with no motion.

- [ ] **Step 3: Commit**

```bash
git add components/blocks/benefits-cards.tsx components/blocks/news-feed.tsx components/blocks/image-gallery.tsx components/blocks/mission-cards.tsx components/blocks/stat-grid.tsx components/blocks/team-directory.tsx components/blocks/link-columns.tsx
git commit -m "$(cat <<'EOF'
Stagger the grid-shaped blocks

Seven grid blocks now drive their own entrance: the grid container
becomes an AnimatedGroup and each cell an AnimatedItem, so items
arrive in sequence instead of as one block. Each opts out of the
section-level reveal so the two entrances don't run over each other.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Card hover treatment

**Files:**
- Modify: `components/blocks/benefits-cards.tsx`, `components/blocks/news-feed.tsx`, `components/blocks/image-gallery.tsx`, `components/blocks/mission-cards.tsx`

**Interfaces:** No signature changes — className-only edits.

- [ ] **Step 1: Pick the right treatment per card, then apply it**

Two treatments, and which one a card gets is decidable by reading it — **`clip-path` clips `box-shadow`, so a glow on a clipped element renders nothing at all:**

**(a) Unclipped card** — the card's own element has no `Clipped` wrapper and no `clip-notch-*` utility. Use the layered neutral glow (the same three-layer structure `LabelPlateCard` already uses — hairline ring, mid bloom, wide ambient halo):

```
transition-shadow duration-300 hover:shadow-[0_0_0_1px_var(--color-osi-steel-500),0_8px_32px_color-mix(in_srgb,var(--color-osi-steel-500)_25%,transparent),0_0_60px_color-mix(in_srgb,var(--color-osi-steel-500)_10%,transparent)]
```

**(b) Clipped card** — the card element is a `Clipped` component or carries a `clip-notch-*` class. A box-shadow would be clipped away, so use border/background instead:

```
transition-colors duration-300 hover:border-osi-steel-500/60 hover:bg-osi-navy-600/60
```

These shadows and borders are decorative, not text, so they do **not** need the `data.background === "cream"` contrast branch that accent *text* colors require — `osi-steel-500` reads correctly as a glow on both navy and cream.

Per file:
- `benefits-cards.tsx` — the card is the `<Clipped>` at line 30, which already has `border border-osi-steel-500/30 bg-osi-navy-600/40`. Treatment **(b)**: append the class string to its existing `className`.
- `news-feed.tsx`, `image-gallery.tsx`, `mission-cards.tsx` — read the card element in each. If it is wrapped in `Clipped` or has a `clip-notch-*` class, use **(b)** (adding a `border border-osi-steel-500/30` base class first if it has no border to transition); otherwise use **(a)**. State in your report which treatment each file got and why.

- [ ] **Step 2: Verify**

Run: `pnpm build && pnpm lint && pnpm exec tsc --noEmit`
Expected: all three succeed.

Run: `pnpm dev`, view the affected blocks (product detail page renders `benefits_cards`).
Expected: hovering a card produces a visible response in every case — a soft steel-blue glow on unclipped cards, a brightening border/background on clipped ones. **If a hover produces no visible change at all, the card is clipped and got treatment (a) by mistake** — switch it to (b). Confirm no gold appears in any hover state.

- [ ] **Step 3: Commit**

```bash
git add components/blocks/benefits-cards.tsx components/blocks/news-feed.tsx components/blocks/image-gallery.tsx components/blocks/mission-cards.tsx
git commit -m "$(cat <<'EOF'
Add hover treatment to the card-bearing blocks

Neutral steel-tinted layered glow on unclipped cards; border/background
transitions on clip-path cards, where a box-shadow would be clipped
away and render nothing. No gold — that stays reserved for CTAs.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Stagger the label-plate grids

**Files:**
- Modify: `components/blocks/label-plate-grid.tsx`
- Modify: the `<Section>` call sites wrapping it — `components/blocks/feature-tiles.tsx`, and whichever of `components/blocks/product-grid.tsx` / `product-grid-client.tsx` and `components/blocks/recommendations.tsx` / `recommendations-client.tsx` actually renders the `<Section>` (read them; the schema file and the client Render file are split, and only one of each pair has it)

**Interfaces:**
- Consumes: `AnimatedGroup`, `AnimatedItem`; the `reveal` prop from Task 1.

`LabelPlateGrid` is shared by three blocks (`feature_tiles`, `product_grid`, `recommendations`), so one edit here covers all three. It is already a client component with its own `openIndex` state for the "one card open per grid" motif — the motion wrappers go *around* each `LabelPlateCard` and must not touch that state.

- [ ] **Step 1: Wrap the grid**

In `components/blocks/label-plate-grid.tsx`, add the import:

```tsx
import { AnimatedGroup, AnimatedItem } from "@/components/ui/animated-group";
```

Replace the returned grid:

```tsx
  return (
    <div className={`grid grid-cols-2 gap-4 ${colsClass}`}>
      {items.map((item, i) => (
        <LabelPlateCard
          key={item.title + i}
          title={item.title}
          body={item.body}
          href={item.href}
          image={item.imageUrl}
          open={openIndex === i}
          onInteract={() => setOpenIndex(i)}
        />
      ))}
    </div>
  );
```

with:

```tsx
  return (
    <AnimatedGroup className={`grid grid-cols-2 gap-4 ${colsClass}`}>
      {items.map((item, i) => (
        <AnimatedItem key={item.title + i}>
          <LabelPlateCard
            title={item.title}
            body={item.body}
            href={item.href}
            image={item.imageUrl}
            open={openIndex === i}
            onInteract={() => setOpenIndex(i)}
          />
        </AnimatedItem>
      ))}
    </AnimatedGroup>
  );
```

The `openIndex`/`setOpenIndex` state and the `open`/`onInteract` props are unchanged — only the wrapping element and the `key`'s owner move.

- [ ] **Step 2: Opt the wrapping sections out**

For each of the three consuming blocks, find the `<Section>` that wraps the `LabelPlateGrid` (in `feature-tiles.tsx` it is in that file; for `product_grid` and `recommendations`, read both the block file and its `-client.tsx` sibling and edit whichever one renders `<Section>`) and add `reveal={false}` to it — the grid now drives its own entrance.

- [ ] **Step 3: Verify**

Run: `pnpm build && pnpm lint && pnpm exec tsc --noEmit`
Expected: all three succeed.

Run: `pnpm dev`, open `http://localhost:3000/products` (renders `product_grid`) and the home page (renders `feature_tiles`).
Expected: the label-plate cards stagger in when the grid enters view. Then confirm the existing motif still works exactly as before: hovering or focusing a closed card opens it and closes the previously-open one, exactly one card is open at a time, the open card still shows its cream body panel and gold "Learn more" bar, and the closed cards still show the steel hover glow added in the foundation plan. Keyboard: Tab to a closed card and press Enter — it opens. With `prefers-reduced-motion: reduce`, cards appear with no entrance motion and the open/close interaction still works.

- [ ] **Step 4: Commit**

```bash
git add components/blocks/label-plate-grid.tsx components/blocks/feature-tiles.tsx components/blocks/product-grid.tsx components/blocks/product-grid-client.tsx components/blocks/recommendations.tsx components/blocks/recommendations-client.tsx
git commit -m "$(cat <<'EOF'
Stagger the label-plate grids

One edit to the shared LabelPlateGrid covers feature_tiles,
product_grid and recommendations. The motion wrappers sit outside each
card so the existing one-open-card-per-grid state is untouched.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Gradient hero eyebrows

**Files:**
- Modify: `components/blocks/hero-full.tsx`, `components/blocks/hero-page.tsx`, `components/blocks/product-hero.tsx`

**Interfaces:**
- Consumes: `GradientText` from `components/ui/gradient-text.tsx`.

Heroes opted out of the entrance animation in Task 1 (LCP), so their motion comes from the eyebrow instead: the gold gradient sweep, which is the one sanctioned decorative gold use outside CTAs. `GradientText` is navy-background-only (there is no WCAG-safe two-stop gold pair on cream), so the existing cream branch keeps its solid `gold-700`.

- [ ] **Step 1: Apply to `hero-full.tsx`**

Add the import: `import { GradientText } from "@/components/ui/gradient-text";`

Replace the eyebrow block (lines 39–47):

```tsx
      {data.eyebrow && (
        <p
          className={`mb-3 font-display text-small-label tracking-wide-label uppercase ${
            data.background === "cream" ? "text-osi-gold-700" : "text-osi-gold-500"
          }`}
        >
          {data.eyebrow}
        </p>
      )}
```

with:

```tsx
      {data.eyebrow && (
        <p className="mb-3 font-display text-small-label tracking-wide-label uppercase">
          {data.background === "cream" ? (
            // GradientText is navy-only — gold-700 is the single
            // WCAG-safe gold on cream, so there is no two-stop sweep
            // to run here (see gradient-text.tsx's comment).
            <span className="text-osi-gold-700">{data.eyebrow}</span>
          ) : (
            <GradientText>{data.eyebrow}</GradientText>
          )}
        </p>
      )}
```

- [ ] **Step 2: Apply the same transformation to `hero-page.tsx` and `product-hero.tsx`**

Both have the same eyebrow shape (a `<p>` with `font-display text-small-label tracking-wide-label uppercase` plus a gold color, possibly with extra classes like `opacity-70`). In each: keep the `<p>`'s layout/typography classes exactly as they are, remove only the gold text-color class (and its cream/navy ternary if present), and move the text into the same cream-vs-navy conditional shown in Step 1. If a file's eyebrow has no cream branch today because its background is always navy, still add the conditional — the `background` field is admin-editable, so an editor can switch it to cream at any time.

- [ ] **Step 3: Verify**

Run: `pnpm build && pnpm lint && pnpm exec tsc --noEmit`
Expected: all three succeed.

Run: `pnpm dev`, open `http://localhost:3000/` (hero_full) and `http://localhost:3000/products/gas-separation/gas-release-system` (product_hero).
Expected: the hero eyebrow text sweeps a gold gradient across itself continuously, and the hero as a whole still paints immediately with no fade-in. With `prefers-reduced-motion: reduce`, the sweep stops and the eyebrow stays legibly gold.

- [ ] **Step 4: Commit**

```bash
git add components/blocks/hero-full.tsx components/blocks/hero-page.tsx components/blocks/product-hero.tsx
git commit -m "$(cat <<'EOF'
Sweep the hero eyebrows with GradientText

Heroes skip the entrance animation to protect LCP, so their motion
comes from the eyebrow instead. Cream backgrounds keep solid gold-700
— there is no WCAG-safe two-stop gold pair on cream to sweep.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Client-boundary blocks

**Files:**
- Modify: `components/blocks/stages-carousel-client.tsx`, `components/blocks/video-embed-client.tsx`

**Interfaces:**
- Consumes: `EASE_OSI` from `lib/motion/variants.ts`; the `animate-pulse-glow` utility from `app/globals.css`.

Both files already carry `"use client"`, so motion goes here and never in their schema/`defineBlock` siblings (`stages-carousel.tsx`, `video-embed.tsx`) — that split is the established gotcha in `CLAUDE.md`.

- [ ] **Step 1: Cross-fade the carousel's stage content**

`stages-carousel-client.tsx` advances through stages with an `index` `useState` and prev/next buttons. Give the stage content a keyed fade so changing stages reads as a transition rather than a hard swap.

Add the imports:

```tsx
import { motion, useReducedMotion } from "motion/react";
import { EASE_OSI } from "@/lib/motion/variants";
```

Add inside the component, next to the existing `useState`:

```tsx
  const reduceMotion = useReducedMotion();
```

Change the stage content container (line 20, `<div className="flex flex-col items-center gap-8 sm:flex-row">`) to a keyed `motion.div`:

```tsx
      <motion.div
        key={index}
        className="flex flex-col items-center gap-8 sm:flex-row"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, ease: EASE_OSI }}
      >
```

(closing `</div>` becomes `</motion.div>`). The `key={index}` is what drives this: React remounts the subtree on each stage change, so the new stage fades in. There is deliberately no exit animation — no `AnimatePresence`, no overlap — because the outgoing and incoming stages would have to be absolutely positioned to coexist, which would fight this block's flex layout. `initial={false}` under reduced motion means the new stage simply appears.

Watch-out: `EASE_OSI` is declared `as const`, so it is a readonly tuple. It is already used this way inside `fadeRiseVariants` and compiles there, so `ease: EASE_OSI` should type-check here too — but if `tsc` rejects it as readonly-vs-mutable, spread it (`ease: [...EASE_OSI]`) rather than duplicating the curve's numbers inline, which would violate the no-second-easing-curve constraint.

- [ ] **Step 2: Give the video play button a pulse and press feedback**

In `video-embed-client.tsx`, the poster state renders a full-bleed `<button aria-label="Play video">` (line 42) containing a white circle (`<span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-osi-white/90 text-osi-navy-900">`, line 49).

Add `group` and press feedback to the button's className (line 45):

```tsx
            className="group absolute inset-0 flex h-full w-full items-center justify-center"
```

And give the circle the neutral pulse plus a hover/press response (line 49):

```tsx
            <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-osi-white/90 text-osi-navy-900 transition-transform duration-200 group-hover:scale-105 group-active:scale-95 motion-safe:animate-pulse-glow">
```

The pulse is the neutral steel variant, not the gold one — this is a play button, not a CTA.

Leave the `<iframe>` itself (rendered once `loaded` is true) completely alone — no decoration on embedded third-party content.

- [ ] **Step 3: Verify**

Run: `pnpm build && pnpm lint && pnpm exec tsc --noEmit`
Expected: all three succeed.

Run: `pnpm dev` and view a page rendering each block (both are seedable via the admin block palette if no seeded page uses them — or preview them by adding each block to a draft page in `/admin/pages` and opening `/preview/<slug>`).
Expected: clicking the carousel's next/prev buttons cross-fades to the new stage over ~250ms rather than snapping, and rapid clicking doesn't leave a stage half-faded or stack two stages. The video poster's play button pulses a soft steel glow, grows slightly on hover, and dips on press; clicking it still swaps in the iframe, which plays normally with no animation on it. With `prefers-reduced-motion: reduce`, the stage swap is instant and the play button's pulse stops.

- [ ] **Step 4: Commit**

```bash
git add components/blocks/stages-carousel-client.tsx components/blocks/video-embed-client.tsx
git commit -m "$(cat <<'EOF'
Animate the carousel and video-poster interactions

Keyed cross-fade on carousel stage changes (no AnimatePresence — the
outgoing stage would need absolute positioning that fights the flex
layout), and a neutral pulse plus press feedback on the video play
button. The embedded iframe is left untouched.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Admin interaction polish

**Files:**
- Modify: `components/admin/media-picker.tsx`, `components/admin/field-renderer.tsx`

**Interfaces:** No signature changes — className-only edits.

Admin polish stops at interaction level: press feedback and hover/focus transitions on controls. No decorative motifs (no clip-paths, duotone, hairline grids, glows) — admin keeps its lighter, unbranded shape treatment. The `<dialog>` open/close is deliberately **not** animated: animating a native `<dialog>` requires `@starting-style` plus `transition-behavior: allow-discrete` or JS coordination, which is disproportionate complexity for a utility surface the client uses a few times a day.

- [ ] **Step 1: Add press feedback to admin buttons**

In `components/admin/media-picker.tsx`, add `transition-transform duration-200 active:scale-[0.97]` to the className of each `<button>` that performs an action — the picker trigger (line ~87), the clear/change control (line ~95), the upload `type="submit"` button (line ~128), and the per-asset select buttons (line ~156). Leave the plain-text `close` link-button (line ~113, `className="text-sm opacity-60 hover:opacity-100"`) with a transition only, since scaling text reads as a glitch:

```tsx
className="text-sm opacity-60 transition-opacity duration-200 hover:opacity-100"
```

- [ ] **Step 2: Add focus/hover transitions to form fields**

In `components/admin/field-renderer.tsx`, add `transition-colors duration-200` to the className of the text/textarea/number/select input elements it renders, so their focus and hover border/background changes ease rather than snap. Do not change any other class — in particular do not touch focus ring colors or add `focus:outline-none`.

- [ ] **Step 3: Verify**

Run: `pnpm build && pnpm lint && pnpm exec tsc --noEmit`
Expected: all three succeed.

Run: `pnpm dev`, log in at `http://localhost:3000/admin/login`, open any page in `/admin/pages` and a block with an image field.
Expected: admin buttons dip slightly while held; the media picker still opens, uploads, and selects exactly as before (no hydration errors in the dev server console — the picker's `<dialog>` is portaled to `document.body` and is sensitive to markup changes); form fields ease into their focus state. Tab through the form and confirm the focus ring is still clearly visible on every control.

- [ ] **Step 4: Commit**

```bash
git add components/admin/media-picker.tsx components/admin/field-renderer.tsx
git commit -m "$(cat <<'EOF'
Add interaction polish to the admin UI

Press feedback on admin buttons and eased focus/hover on form fields.
Interaction-level only — admin keeps its unbranded shape treatment,
and the native <dialog> open/close stays unanimated rather than
pulling in @starting-style for a utility surface.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Document the motion conventions

**Files:**
- Modify: `CLAUDE.md`

The foundation plan's final reviewer flagged this: ~20 files now follow motion conventions that exist nowhere but in two plan documents. `CLAUDE.md` is where this project's cross-phase conventions live.

- [ ] **Step 1: Add a "Motion" section to `CLAUDE.md`**

Insert a new section directly after the "Design tokens" section, matching the surrounding prose style (plain paragraphs and short bullets, no headings deeper than `###`):

```markdown
## Motion (Phases 1–2 of the redesign, done)

`motion` (Framer Motion) is the only animation dependency. Shared tuned
constants live in `lib/motion/variants.ts` (`EASE_OSI` mirrors the CSS
`--ease-osi` curve — never introduce a second easing curve). CSS
keyframe utilities (`animate-float`, `animate-gradient-shift`,
`animate-marquee`, `animate-spin-slow`, `animate-pulse-glow`,
`animate-pulse-glow-gold`) are declared in `app/globals.css` and must
always be used with a `motion-safe:` prefix at the call site.

Primitives in `components/ui/`: `RevealSection` (drives `Section`'s
`reveal` prop), `AnimatedSection` (single fade+rise), `AnimatedGroup` +
`AnimatedItem` (staggered grids), `TiltCard`, `GradientText` (gold
sweep, **navy backgrounds only**), `MarqueeStrip`. Every one is
previewed on `/styleguide`.

Rules that must hold for any new animated component:

- **Reduced motion is not optional.** CSS animations get `motion-safe:`;
  Framer Motion components call `useReducedMotion()` in-component,
  because the global `prefers-reduced-motion` rule in `globals.css`
  cannot reach JS-driven motion.
- **A block either uses `Section`'s `reveal` or its own stagger, never
  both.** A block wrapping its grid in `AnimatedGroup` passes
  `reveal={false}`.
- **Heroes pass `reveal={false}`.** An opacity-0 start delays LCP, and
  the hero is the LCP element on both Lighthouse target pages.
- **Never wrap absolutely-positioned children in a transformed
  element.** A transform creates a containing block, which silently
  re-anchors hero background images, `CtaBreakoutBar` overhangs and
  `HairlineGrid` overlays. That is why `RevealSection` animates the
  `<section>` element itself rather than an inner wrapper.
- **`clip-path` clips `box-shadow`.** A glow on a `Clipped` element or a
  `clip-notch-*` utility renders nothing — use border/background hover
  transitions there, or move the glow to an unclipped parent.
- **Gold stays scarce in motion too.** `animate-pulse-glow-gold` and
  `GradientText` are for CTAs and hero eyebrows; everything else uses
  the neutral `osi-steel-500` variants.
```

- [ ] **Step 2: Verify**

Run: `pnpm lint`
Expected: succeeds (no code changed, but confirms nothing else broke).

Read the edited section back and confirm every claim in it is true of the current code: each named file exists, each named utility is declared in `globals.css`, and `Section` really does take a `reveal` prop. A convention doc that misnames a file is worse than none.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "$(cat <<'EOF'
Document the motion conventions in CLAUDE.md

~20 files now follow rules that lived only in two plan documents —
reduced-motion handling, the reveal-vs-stagger choice, the
transform/containing-block and clip-path/box-shadow traps, and gold
scarcity in motion.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Verification pass

**Files:** none (verification only, no commit)

- [ ] **Step 1: Full clean build**

Run: `pnpm build && pnpm lint && pnpm exec tsc --noEmit`
Expected: all three succeed with zero errors/warnings.

- [ ] **Step 2: Lighthouse — the load-bearing check for this plan**

This plan adds a client component boundary to nearly every section on every page, so Performance is the number to watch.

```bash
lsof -ti:3000 | xargs kill -9 2>/dev/null; true
pnpm start &
sleep 5
npx --yes lighthouse@13 http://localhost:3000/ --output=json --output-path=/tmp/lh-home.json --chrome-flags="--headless" --only-categories=performance,accessibility,best-practices,seo
npx --yes lighthouse@13 http://localhost:3000/products/gas-separation/gas-release-system --output=json --output-path=/tmp/lh-product.json --chrome-flags="--headless" --only-categories=performance,accessibility,best-practices,seo
lsof -ti:3000 | xargs kill -9 2>/dev/null; true
```

Baseline to beat: 94/100/100/100 on both pages (measured at the end of the foundation plan; the pre-redesign baseline was 100/9x/100/100).

Expected: all four categories ≥ 90 on both pages. Also read these specific audits out of the JSON and report them: `largest-contentful-paint`, `cumulative-layout-shift`, `non-composited-animations`, and `total-blocking-time`.

**If Performance drops below 90**, diagnose before accepting it:
- Check `largest-contentful-paint` — if LCP regressed, a hero probably lost its `reveal={false}` opt-out (Task 1, Step 3). Verify all four opt-outs are still in place.
- Check `non-composited-animations` — if it flags an element, that animation is running on a property the compositor can't handle; switch it to `transform`/`opacity`.
- Check `total-blocking-time` / bundle size — if the added client boundaries are the cost, adopt `LazyMotion` with the `domAnimation` feature bundle and swap `motion.*` for `m.*` in the primitives. This was flagged as a known lever by the foundation plan's final review; do it only if the numbers actually demand it.

- [ ] **Step 3: Product detail page inherits the rollout**

The product detail page (`app/(site)/products/[category]/[slug]/page.tsx`) composes `ProductHeroRender`, `BenefitsCardsRender`, `StagesCarouselRender`, `HowItWorksRender` and `SpecTableRender` directly rather than through `BlockRenderer` — but those are the same Render components this plan edited, so it should inherit everything with no changes to that file.

Run: `pnpm dev`, open `http://localhost:3000/products/gas-separation/gas-release-system`.
Expected, confirming the inheritance actually happened: the product hero paints immediately with a sweeping gold eyebrow and no fade; the benefits cards stagger in on scroll and glow/brighten on hover; the stages carousel cross-fades between stages; the spec table section fades+rises on scroll. If any of these is missing, that Render component was missed by its task — report which.

- [ ] **Step 4: Reduced-motion and gold sweeps**

Reduced motion — grep every file this plan touched and confirm each animated element has a guard (`motion-safe:` / `motion-reduce:` for CSS, `useReducedMotion()` for Framer Motion). Then run `pnpm dev` and toggle `prefers-reduced-motion: reduce` in devtools on the home page, `/products`, a product detail page and `/contact`: nothing should loop, bob, pulse, slide, tilt or sweep, and every section's content must still be visible and every control still operable.

Gold — run `git diff <this plan's base commit>..HEAD -- '*.tsx' '*.css' | grep -n "gold"` and confirm new gold usage appears only in the three hero files (Task 5's `GradientText` eyebrows). Any other new gold is a finding.

- [ ] **Step 5: No commit for this task**

Verification only. If a check fails, fix it in the task that owns the file rather than bundling a fix here.

---

## Out of scope for this plan

- `accordion.tsx` — native `<details>`/`<summary>` with an existing CSS-only `group-open:rotate-45`. Layering JS animation on native disclosure semantics risks breaking the toggle; it stays CSS-only.
- `global-map.tsx` — its own comment notes the real interactive SVG map is still an open decision in `docs/DECISIONS.md`; the current pill list is a placeholder whose DOM shape is expected to change. It gets section-level reveal from Task 1 and nothing more.
- `contact-form-client.tsx` beyond its Task 1 opt-out — form fields shouldn't move.
- `TiltCard` wiring. The primitive ships and is previewed on `/styleguide`, but no block adopts it here: the three card grids that would suit it are all `LabelPlateGrid`-based, where a cursor-follow tilt would compete with the existing one-open-card hover interaction. Revisit as its own change if the client wants it.
- The admin `<dialog>` open/close animation (see Task 7's rationale).
