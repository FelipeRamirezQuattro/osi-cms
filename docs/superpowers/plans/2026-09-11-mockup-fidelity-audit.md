# Mockup-fidelity audit & correction — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the live site's typography, casing, and two known content bugs back to what `docs/design/OSI Mock-Up 9-3-2026.pdf` actually shows, restoring the mockup's two-typeface system that an earlier phase collapsed into one.

**Architecture:** No new components, no restructuring. A second `next/font/google` family is registered as a sibling design token (`--font-display-soft`) alongside the existing `--font-display` (Orbitron), and applied via a plain className swap to the specific `components/blocks/*.tsx` headings the mockup shows it on. Everything else — the six signature motifs, the navy/cream/gold palette, this session's motion work — is untouched.

**Tech Stack:** Next.js 16 (App Router, TS strict), Tailwind v4 (`@theme` tokens), `next/font/google`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-11-mockup-fidelity-audit-design.md`

## Global Constraints

- **No new visual direction.** Every correction traces to a specific mockup page/element cited in the spec. Never invent a treatment the mockup doesn't show.
- **The six signature motifs and the palette are untouched** — angled corner clips, circled-arrow buttons, hairline grid overlay, label-plate cards, duotone photography, breakout gold CTA bar; navy `#001B33`/`#04243D`, cream `#F2E9DE`, gold `#E2902A`.
- **This session's motion work must survive intact** — scroll reveal, hover glow, hero eyebrow gradient sweep, carousel cross-fade, video button pulse. This plan only touches className strings on elements the motion work already wraps; never remove or reorder a `motion.*`/`Reveal*`/`Animated*` wrapper.
- **English only** in code/comments/docs.
- `pnpm build`, `pnpm lint`, `pnpm exec tsc --noEmit` clean at the end of every task.
- No fabricated content — the two content bugs this plan fixes (stat over-capitalization, duplicate heading) are corrected to match existing stored data, never invented copy.

---

### Task 1: Register the second display font

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Modify: `app/styleguide/page.tsx`

**Interfaces:**
- Produces: the `font-display-soft` Tailwind utility class (backed by `--font-display-soft`), consumable by every later task in this plan.

- [ ] **Step 1: Add the Poppins import and font loader in `app/layout.tsx`**

Change line 2 from:
```tsx
import { Orbitron, Montserrat } from "next/font/google";
```
to:
```tsx
import { Orbitron, Montserrat, Poppins } from "next/font/google";
```

After the existing `montserrat` const (currently lines 12–17), add:
```tsx
const poppins = Poppins({
  variable: "--font-display-soft",
  subsets: ["latin"],
  weight: ["500", "600"],
});
```

Change the `<html>` tag's className (currently `` `${orbitron.variable} ${montserrat.variable} h-full antialiased` ``) to also include `poppins.variable`:
```tsx
<html lang="en" className={`${orbitron.variable} ${montserrat.variable} ${poppins.variable} h-full antialiased`}>
```

- [ ] **Step 2: Register the token in `app/globals.css`**

In the `@theme` block, directly after `--font-display: "Orbitron", sans-serif;`, add:
```css
  --font-display-soft: "Poppins", sans-serif;
```

- [ ] **Step 3: Preview it on `/styleguide`**

In `app/styleguide/page.tsx`'s `Type` section (the `<Section bg="cream"><Heading>Type</Heading>...` block, currently lines 91–110), add a new row directly after the existing `text-section` row (after the `<p className="font-display text-section tracking-tightest-display uppercase">Section title</p>` block, before the `text-card-label` row):

```tsx
          <p className="font-display-soft text-section font-semibold">
            Section title — soft
          </p>
```

Note this new row is deliberately **not** `uppercase` and uses `font-semibold` rather than the display font's own weight — Font B in the mockup is mixed-case with a lighter touch than Font A, per the design spec's evidence (`docs/superpowers/specs/2026-09-11-mockup-fidelity-audit-design.md`).

- [ ] **Step 4: Verify**

Run: `pnpm build && pnpm lint && pnpm exec tsc --noEmit`
Expected: all three succeed.

Run: `pnpm dev`, open `http://localhost:3000/styleguide`, scroll to the "Type" section.
Expected: a new "Section title — soft" line renders in a visibly different, rounder typeface than the "Section title" line above it (Poppins vs. Orbitron), in normal mixed case (not uppercase).

Open the mockup PDF (`docs/design/OSI Mock-Up 9-3-2026.pdf`) to any page showing "Tailored Solutions for Your Industry" or "Leave us a message" and compare by eye. If Poppins reads meaningfully different from the mockup's rounder font (this is a best-effort match, not an extraction), swap to a closer Google Font — `Quicksand`, `Nunito`, or `Baloo 2` are the next things to try, same `next/font/google` import pattern, same `--font-display-soft` variable name so no other task needs to change.

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/globals.css app/styleguide/page.tsx
git commit -m "$(cat <<'EOF'
Register the mockup's second display typeface as a design token

The mockup (docs/design/OSI Mock-Up 9-3-2026.pdf) specifies two
typefaces: the existing sharp/angular one (Orbitron, --font-display)
for primary headlines/nav/cards, and a second, rounder one for a
specific set of secondary section headers that the live site never
implemented — collapsing everything into Orbitron is the concrete,
evidence-backed source of "too square" feedback (see the design spec).
Poppins is the closest available Google Font match; --font-display-soft
keeps it swappable in one place if it doesn't read close enough.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Apply the second typeface to the four confirmed headers

**Files:**
- Modify: `components/blocks/section-heading.tsx:24`
- Modify: `components/blocks/mission-cards.tsx:35`
- Modify: `components/blocks/global-map.tsx:35`
- Modify: `components/blocks/contact-form-client.tsx:24`

**Interfaces:**
- Consumes: the `font-display-soft` utility class from Task 1.

All four files currently render their heading with the exact class string `font-display text-section tracking-tightest-display uppercase` (mission-cards uses `text-card-label` in place of `text-section`) — the Font A treatment. The design spec (`docs/superpowers/specs/2026-09-11-mockup-fidelity-audit-design.md`, "Correction plan" §2) confirmed against the actual mockup pages that all four should use Font B instead. The underlying title strings are already stored in natural mixed/lowercase case (`"See our global locations"`, `"Leave us a message"`, etc.) — dropping `uppercase` is enough to get mockup-like casing; no seed-data or schema-default changes are needed anywhere in this task.

- [ ] **Step 1: `section-heading.tsx`**

In `components/blocks/section-heading.tsx:24`, change:
```tsx
        <h2 className="font-display text-section tracking-tightest-display uppercase">
```
to:
```tsx
        <h2 className="font-display-soft text-section font-semibold">
```

- [ ] **Step 2: `global-map.tsx`**

In `components/blocks/global-map.tsx:35`, change:
```tsx
      <h2 className="font-display text-section tracking-tightest-display uppercase">
```
to:
```tsx
      <h2 className="font-display-soft text-section font-semibold">
```

- [ ] **Step 3: `contact-form-client.tsx`**

In `components/blocks/contact-form-client.tsx:24`, change:
```tsx
      <h2 className="mb-8 font-display text-section tracking-tightest-display uppercase">
```
to:
```tsx
      <h2 className="mb-8 font-display-soft text-section font-semibold">
```

- [ ] **Step 4: `mission-cards.tsx` — font swap plus the prominence restoration**

The design spec's finding 1 also flagged that "Our Mission"/"Global Impact" are demoted to small labels on the live site versus substantial headers in the mockup. In `components/blocks/mission-cards.tsx:35`, change:
```tsx
              <h3 className="font-display text-card-label tracking-wide-display uppercase">
                → {card.title}
```
to:
```tsx
              <h3 className="font-display-soft text-section font-semibold">
                {card.title}
```

This does two things at once: swaps to Font B (matching the mockup), and moves the size from `text-card-label` (small) to `text-section` (the same size used for major section headers elsewhere — matches the mockup's visual weight for "Our Mission"/"Global Impact"). It also drops the `→ ` arrow prefix — the mockup shows a plain heading with a separate "Learn more" affordance below it (already present in this file, unchanged by this step), not an inline arrow glyph in the heading text itself.

- [ ] **Step 5: Verify**

Run: `pnpm build && pnpm lint && pnpm exec tsc --noEmit`
Expected: all three succeed.

Run: `pnpm dev`, open `http://localhost:3000/` (renders `section_heading` — "Tailored Solutions for Your Industry" — and `mission_cards` — "Our Mission"/"Global Impact") and `http://localhost:3000/contact` (renders `contact-form-client.tsx`'s "Leave us a message"; `global_map`'s "See our global locations" also renders on `/` and `/contact` per the seed data referenced in the spec).

Expected: all four headers now render in the rounder Font B typeface, mixed case (not all-caps), and "Our Mission"/"Global Impact" are visibly larger/more prominent than before — no longer reading as small uppercase labels. Confirm no other text on these pages changed, and confirm the scroll-reveal/stagger entrance animations on these sections still play (this plan doesn't touch the `Section`/`AnimatedGroup` wrappers, only the heading `className` inside them — verify rather than assume).

- [ ] **Step 6: Commit**

```bash
git add components/blocks/section-heading.tsx components/blocks/mission-cards.tsx components/blocks/global-map.tsx components/blocks/contact-form-client.tsx
git commit -m "$(cat <<'EOF'
Apply the mockup's second typeface to its four confirmed headers

section-heading ("Tailored Solutions for Your Industry"), mission-cards
("Our Mission"/"Global Impact" — also restored to mockup-scale
prominence from a demoted small-label treatment), global-map ("See our
global locations"), and the contact form's "Leave us a message" all
move from the primary angular typeface to the mockup's second, rounder
one, matching mixed-case rather than forced uppercase. Confirmed
against the actual mockup pages in the design spec, not guessed.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Confirm the remaining Font-A-pattern blocks are out of the mockup's scope

**Files:** none modified — this task is a documented verification, with corrections only if evidence contradicts the default.

**Interfaces:** none.

The design spec's completeness check found 18 files sharing the exact Font A heading class; Task 2 moved 4 of them to Font B. The other 14 (`benefits-cards.tsx`, `accordion.tsx`, `feature-tiles.tsx`, `cta-band.tsx`, `image-gallery.tsx`, `how-it-works.tsx`, `hero-page.tsx`, `news-feed.tsx`, `product-hero.tsx`, `product-grid.tsx`, `recommendations.tsx`, `video-embed-client.tsx`, `spec-table.tsx`, `split-feature.tsx`, `team-directory.tsx`) split into two groups:

- **6 already confirmed correct as Font A** by the spec, directly against the mockup: `benefits-cards.tsx`, `how-it-works.tsx`, `hero-page.tsx`, `product-hero.tsx`, `product-grid.tsx`, `recommendations.tsx` (render "BENEFITS", "HOW DOES IT WORK?", "CONTACT US"/page H1s, product headlines, "PRODUCTS", "RECCOMENDATIONS" — all uppercase/angular in the mockup too). **No action needed on these 6** — do not re-check them, the spec already did.
- **9 not yet cross-checked**, because they render on pages this audit's 4 screenshots didn't cover: `accordion.tsx`, `feature-tiles.tsx`, `cta-band.tsx`, `image-gallery.tsx`, `news-feed.tsx`, `video-embed-client.tsx`, `spec-table.tsx`, `split-feature.tsx`, `team-directory.tsx`.

- [ ] **Step 1: Determine which pages actually instantiate each of the 9 blocks with a title**

Run:
```bash
grep -rn "type: \"accordion\"\|type: \"feature_tiles\"\|type: \"cta_band\"\|type: \"image_gallery\"\|type: \"news_feed\"\|type: \"video_embed\"\|type: \"spec_table\"\|type: \"split_feature\"\|type: \"team_directory\"" scripts/*.ts
```

For each hit, note which seed script it's in (`seed-home-page.ts`, `seed-static-pages.ts`, or `migrate-legacy.ts`'s output target — cross-reference against `scripts/migrate-legacy.ts`'s documented page list in `CLAUDE.md` §"Legacy content migration": about-us, careers, hiring, hse, sg-sst-policies, terms/privacy, the 3 services sub-pages, machine-shop, services listing).

- [ ] **Step 2: Apply the decision rule**

The mockup (`docs/design/OSI Mock-Up 9-3-2026.pdf`) covers exactly 5 distinct page types: home, the mega-menu overlay, the products listing (2 tab states), a product detail page, and the contact page. For each of the 9 blocks:

- **If Step 1 shows it's only instantiated on a migrated/legacy page** (about-us, careers, hse, services sub-pages, etc. — anything not in the mockup's 5 covered page types) — **leave it as Font A, unchanged.** There is no mockup evidence to justify moving it, and per this plan's Global Constraints, never invent a treatment the mockup doesn't show. Record which blocks fell into this bucket in the commit message for this task.
- **If Step 1 shows it's instantiated on the home page, products listing, product detail, or contact page** — open the corresponding mockup page(s) and the current live page (`pnpm dev`, same routes as Task 2's verify step) side by side, and check that specific block's heading the same way the spec did for the other four: same typeface as the mockup, same case. If it matches Font A already, no change. If it shows Font B's rounder treatment in the mockup, apply the exact same two-part edit as Task 2 (swap `font-display` → `font-display-soft`, drop `uppercase`, matching that file's existing class structure) and note it explicitly — this would be a genuine, evidence-based addition to Task 2's list, not a guess.

- [ ] **Step 3: Verify**

If Step 2 found no blocks needing a change: run `pnpm build && pnpm lint && pnpm exec tsc --noEmit` to confirm the tree is still clean (no files should have changed).

If Step 2 found and fixed any blocks: same three commands, plus a `pnpm dev` visual check of the specific page/block changed, following the same pattern as Task 2's verify step.

- [ ] **Step 4: Commit**

If no files changed, commit nothing — instead, note in this plan's tracking (or the SDD ledger, if using subagent-driven-development) which of the 9 blocks were confirmed legacy-only (Font A correctly retained, no mockup evidence either way) and which were confirmed mockup-covered-and-already-correct.

If Step 2 found and fixed any blocks, commit them:
```bash
git add <changed files>
git commit -m "$(cat <<'EOF'
Apply Font B to <block name>, confirmed against mockup page <N>

<One sentence: what the mockup page showed and which file/heading this
corrects, matching Task 2's evidence-based pattern.>

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Fix the over-capitalized stat unit

**Files:**
- Modify: `components/blocks/stat-grid.tsx`

**Interfaces:** none.

The design spec's finding 2: the mockup shows `"$480 million"` (lowercase "million") and `"120% increase"` (lowercase "increase"), but the live site renders `"$480 MILLION"` — the stat's unit/caption text is force-uppercased where the mockup keeps it in natural case.

- [ ] **Step 1: Find the uppercase source**

Run:
```bash
grep -n "uppercase\|value\|label" components/blocks/stat-grid.tsx
```

Read the file. The stat's numeric `value` (e.g. `"$480 million"`) and its `label`/caption are two separate rendered elements — find which one currently carries an `uppercase` class and confirm from the seed data (`grep -n "480 million\|CAPEX" scripts/seed-home-page.ts`) that the stored string already has natural casing (`"million"` lowercase) and the CSS is what's forcing it uppercase, not the content itself.

- [ ] **Step 2: Remove the uppercase transform from the value**

Remove the `uppercase` class from the element rendering the stat's `value` (leave any `uppercase` class on the separate caption/label element alone if the mockup shows that part uppercase — check `"CAPEX and OPEX savings in the last 5 years"` in the mockup: it's mixed case too, so if that element is also uppercase in the current code, remove it there as well). Keep every other class on that element (font, size, color, weight) exactly as-is — this is a single-utility removal, not a restyle.

- [ ] **Step 3: Verify**

Run: `pnpm build && pnpm lint && pnpm exec tsc --noEmit`
Expected: all three succeed.

Run: `pnpm dev`, open `http://localhost:3000/` and scroll to the stats row (currently reads "$480 MILLION", "40,000+", "120%", "145+", "9+" with captions).
Expected: `"$480 million"` renders with lowercase "million" (and the caption text matches the mockup's natural mixed case), matching `docs/design/OSI Mock-Up 9-3-2026.pdf` page 1/2's stat row. Numeric-only stats (`"40,000+"`, `"9+"`) are unaffected since they have no letter casing to change.

- [ ] **Step 4: Commit**

```bash
git add components/blocks/stat-grid.tsx
git commit -m "$(cat <<'EOF'
Stop force-uppercasing stat unit text

The mockup shows "$480 million" / "120% increase" in natural mixed
case; the live site's `uppercase` class on the stat value/caption
turned this into "$480 MILLION", a casing drift not present in the
approved design.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Remove the duplicate "PRODUCTS" heading

**Files:**
- Modify: the file that renders the duplicate heading (identified in Step 1 below — likely `components/blocks/product-grid.tsx` or the `/products` listing page's composition, per the design spec's finding 3)

**Interfaces:** none.

The design spec's finding 3: `/products` currently renders "PRODUCTS" as the `hero_page` block's H1, then a second, separate "PRODUCTS" heading directly above the Products/Industries/Applications/Services tab row. The mockup (page 4/5) goes straight from the hero into the tab row with no second heading.

- [ ] **Step 1: Locate the duplicate**

Run:
```bash
grep -rn "\"PRODUCTS\"\|'PRODUCTS'\|title.*[Pp]roducts" components/blocks/product-grid.tsx components/blocks/product-grid-client.tsx
```

Also check whatever page/route composes the `/products` listing (`app/(site)/products/page.tsx` or equivalent — find it via `grep -rln "product_grid\|ProductGrid" app/`) for a second, separately-sourced "Products" title (e.g., a page-level heading rendered outside the block itself). Read enough of the surrounding code to confirm which element is the redundant one — the mockup's tab row (Products/Industries/Applications/Services) sits directly below the hero with no heading between them, so whichever heading sits between the hero and the tab row is the one to remove.

- [ ] **Step 2: Remove the redundant heading**

Delete the JSX for the duplicate heading element found in Step 1. Do not remove the `hero_page` block's own H1 ("PRODUCTS" in the navy hero) — that one matches the mockup. Do not remove the tab row itself.

- [ ] **Step 3: Verify**

Run: `pnpm build && pnpm lint && pnpm exec tsc --noEmit`
Expected: all three succeed.

Run: `pnpm dev`, open `http://localhost:3000/products`.
Expected: "PRODUCTS" appears exactly once (in the navy hero), followed directly by the Products/Industries/Applications/Services tab row on the cream section below — matching `docs/design/OSI Mock-Up 9-3-2026.pdf` page 4. No leftover empty spacing where the removed heading was (check the section's padding still reads correctly — if removing the heading leaves an oddly large gap, that's this task's problem to fix too, not deferred to Task 6).

- [ ] **Step 4: Commit**

```bash
git add <file(s) changed>
git commit -m "$(cat <<'EOF'
Remove duplicate "PRODUCTS" heading on the products listing page

The page rendered "PRODUCTS" twice — once as the hero H1, once again
directly above the category tab row. The mockup goes straight from
the hero into the tab row with no second heading.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Verification pass

**Files:** none (verification only, no commit)

- [ ] **Step 1: Full clean build**

Run: `pnpm build && pnpm lint && pnpm exec tsc --noEmit`
Expected: all three succeed with zero errors/warnings.

- [ ] **Step 2: Page-by-page visual comparison against the mockup**

For each of home (`/`), products listing (`/products`), a product detail page (`/products/gas-separation/gas-release-system`), and contact (`/contact`): open the live page and the corresponding mockup page side by side (same viewport width as reasonably possible — the mockup pages are roughly a wide desktop layout).

Check specifically:
- Font B renders where Task 2 (and any additions from Task 3) applied it, Font A everywhere else — no section should read as all one typeface where the mockup shows two.
- Section vertical rhythm (spacing between major sections), card internal padding, and grid gutters read comparably tight/loose to the mockup — not visibly more cramped or more sparse. If any page reads off, identify the specific `Section`/card component and spacing utility class responsible (`components/ui/section.tsx`'s `SPACING_CLASSES`, or a card's own padding classes) and correct it, following the same single-utility-change discipline as Tasks 2 and 4 — don't restyle anything the mockup doesn't show a difference on.
- The stat row shows natural-case text (Task 4) and `/products` shows "PRODUCTS" once (Task 5).

Fix anything found directly in this step, in the specific file responsible, and re-run Step 1 after each fix.

- [ ] **Step 3: Confirm this session's motion work survived**

Run: `pnpm dev`, open `http://localhost:3000/` and `http://localhost:3000/products/gas-separation/gas-release-system`, scroll each fully.

Expected: sections still fade+rise on scroll, the hero eyebrow still sweeps gold on navy pages, card grids still stagger in, hovering a card still shows the neutral glow. None of this plan's tasks touched a `motion.*`/`Reveal*`/`Animated*` wrapper or a `Section`'s `reveal` prop — this step confirms that held in practice, not just in theory.

- [ ] **Step 4: Lighthouse — confirm no regression from the added font**

```bash
lsof -ti:3000 | xargs kill -9 2>/dev/null; true
pnpm start &
sleep 5
npx --yes lighthouse@13 http://localhost:3000/ --output=json --output-path=/tmp/lh-home.json --chrome-flags="--headless" --only-categories=performance,accessibility,best-practices,seo
npx --yes lighthouse@13 http://localhost:3000/products/gas-separation/gas-release-system --output=json --output-path=/tmp/lh-product.json --chrome-flags="--headless" --only-categories=performance,accessibility,best-practices,seo
lsof -ti:3000 | xargs kill -9 2>/dev/null; true
```

Baseline to beat: 94/100/100/100 (home) and 99/100/100/100 (product detail), from the end of the motion-rollout plan. Expected: all four categories ≥ 90 on both pages, and Performance not meaningfully worse than baseline (a second `next/font/google` family is a small, known cost — if Performance drops more than a couple of points, check whether Poppins is loading extra unused weights and trim the `weight` array in `app/layout.tsx` to only what's actually used).

- [ ] **Step 5: No commit for this task**

Verification only. Any fix found in Step 2 gets its own commit at the point it's made, not bundled here.
