# Mockup-fidelity audit & correction — design spec

**Date:** 2026-09-11
**Status:** proposed, pending user review

## Why

The live site was judged "too square" / "not modern." Investigation against the
approved mockup (`docs/design/OSI Mock-Up 9-3-2026.pdf`, 8 pages) found a real,
concrete cause: the mockup actually specifies **two distinct display
typefaces**, not one. The live implementation collapsed both into a single
always-uppercase, angular/geometric font (the current `--font-display`,
aliased "Orbitron" in `CLAUDE.md`), which is a genuine simplification made in
an earlier phase — not something this pass invents, and not something to
guess at further. This spec corrects the implementation back to what the
mockup actually shows, plus the concrete spacing/casing deviations found
alongside it.

**Explicitly out of scope** (per direct user decision):
- The six signature motifs (angled corner clips, circled-arrow buttons,
  hairline grid overlay, label-plate cards, duotone photography, gold CTA
  bar) — unchanged.
- The palette (navy/cream/gold) — unchanged.
- No new mockups or visual direction — corrections are 100% sourced from the
  existing mockup PDF.
- This session's motion work (scroll reveal, hover glow, hero eyebrow sweep,
  carousel/video motion) — must remain intact and working after this pass.

## The core finding: two typefaces, not one

Reading all 8 mockup pages against 4 corresponding live pages (home,
products listing, product detail, contact) plus the shared header/footer/
mega-menu:

**Font A — sharp, angular/geometric, always uppercase.** Used in the mockup
for: primary page H1s ("PRODUCTS", "CONTACT US", "ESP VORTEX DESANDER"),
nav items, mega-menu category headers, card overlay labels ("GAS RELEASE
SYSTEM", "ESP CHEM SCREEN"), tab labels, "BENEFITS", "HOW DOES IT WORK?",
"PROVEN QUALITY", "STAGE ONE". **This is already implemented correctly** —
the current `--font-display` (Orbitron) matches the mockup here. No change
needed for any of these elements.

**Font B — rounder, softer, mixed-case.** Used in the mockup for a specific
set of *secondary section headers*: "Tailored Solutions for Your Industry",
"Our Mission", "Global Impact", "See Our Global Locations", "Leave Us A
Message" (this last one is capitalized in the mockup but rendered in Font B,
not Font A — directly comparable side-by-side against the live
implementation of the same string, which uses Font A). **This typeface does
not exist in the current implementation at all** — every one of these
headers was implemented in Font A (Orbitron, always-uppercase), which is
the concrete source of the "square"/monotone feeling: the whole page reads
in one angular voice where the mockup deliberately alternates between two.

Evidence: `home-normal.png` (this session's screenshot) vs. mockup page 1
— "TAILORED SOLUTIONS FOR YOUR INDUSTRY" (live, Font A, all-caps) vs.
"Tailored Solutions for Your Industry" (mockup, Font B, title case).
`hero-cream.png` vs. mockup page 8 (contact) — "LEAVE US A MESSAGE" (live,
Font A) vs. "Leave Us A Message" (mockup, Font B) — same string, directly
comparable, unambiguous font mismatch.

## Other concrete deviations found

1. **"Our Mission" / "Global Impact" demoted to small labels.** Mockup shows
   these as substantial section headers (Font B, prominent size) each
   introducing its own content block with a "Learn more" affordance. Live
   (`home-normal.png`) renders them as small, arrow-prefixed uppercase labels
   — a real size/prominence demotion, not just a font issue.
   `components/blocks/mission-cards.tsx` needs both the Font B header and
   restored heading-level prominence (see the Correction Plan below for the
   exact class).
2. **Stat labels over-capitalized.** Mockup: "$480 million" (lowercase
   "million"), "120% increase" (lowercase "increase"). Live
   (`home-normal.png`): "$480 MILLION" — the unit word is force-uppercased
   where the mockup keeps it lowercase. Likely a CSS `uppercase` utility
   applied to the whole stat block rather than just the numeral. Affects
   `stat-grid.tsx`.
3. **Duplicate "PRODUCTS" heading on the products listing page.** Live
   (`products-normal.png`) shows "PRODUCTS" as the hero H1, then a second,
   separate "PRODUCTS" heading directly above the
   Products/Industries/Applications/Services tab row — the mockup (page 4)
   goes straight from the hero into the tab row with no second heading.
   Likely a redundant title in `product-grid.tsx` or its listing-page
   composition — implementer should locate and remove the duplicate rather
   than guess which one is "correct" without reading the code.
4. **Spacing/padding pass.** The user asked explicitly that margins and
   padding "look fine" — beyond the specific font/casing findings above,
   the implementer doing this work should do a side-by-side pass on each
   of the 4 pages (screenshot vs. mockup page, both at comparable viewport
   width) checking section vertical rhythm, card internal padding, and
   grid gutters, and correct any that read as visibly tighter/looser than
   the mockup. This is deliberately not itemized further here because it's
   best caught by direct visual comparison during implementation, not
   guessed at from a design doc.

## What does NOT need to change

- Font A (Orbitron) usage on primary headlines, nav, card labels, tabs —
  confirmed correct against the mockup on the product detail page
  (`hero-navy.png` vs. mockup page 6) and products listing page
  (`products-normal.png` vs. mockup page 4). Do not touch these.
- The six motifs, palette, and all of this session's motion work.
- Content gaps (missing map integration on `/contact`, missing category
  images, placeholder benefit copy) — these are known, already-logged
  content gaps (`docs/CONTENT-GAPS.md`), not design-system defects. Not
  addressed by this pass.

## Correction plan

**1. Add the second display font as a token.**
`app/globals.css` (or wherever `--font-display`/`font-orbitron` is
currently declared) gains a sibling token, e.g. `--font-display-soft`,
backed by a `next/font/google` import alongside the existing
Orbitron/Montserrat loads in the root layout. Closest available match to
the mockup's Font B: **Poppins** (medium/semibold weight) — a widely-used,
modern geometric sans with soft rounded terminals, pairs cleanly with the
existing Montserrat body font, available via Google Fonts. This is a
best-effort visual match, not a pixel-identical extraction (impossible from
a flattened PDF) — the implementer renders it on `/styleguide` next to a
mockup crop and swaps to a different Google Font in one line if it doesn't
read close enough.

**2. Apply Font B to the specific headers the mockup shows it on.** All four
confirmed by reading the actual source (not guessed), and all four currently
share the exact same class pattern — `font-display text-section
tracking-tightest-display uppercase` (mission-cards uses `text-card-label`
instead of `text-section`, consistent with finding 1's demoted-prominence
observation) — which is the Font A treatment. In each, swap `font-display`
for the new Font B token and drop `uppercase` (the underlying stored title
strings are already lowercase/sentence-case — `"See our global locations"`,
`"Leave us a message"` — so removing the CSS transform is enough to get
mockup-like casing; no content/seed-data change needed):

- `components/blocks/section-heading.tsx:24` — `<h2 className="font-display
  text-section tracking-tightest-display uppercase">` renders "Tailored
  Solutions for Your Industry" (block type `section_heading`).
- `components/blocks/mission-cards.tsx:35` — `<h3 className="font-display
  text-card-label tracking-wide-display uppercase">` renders "Our
  Mission"/"Global Impact" (block type `mission_cards`). Also needs the
  finding-1 prominence restoration — likely `text-section` or a new
  intermediate size, not `text-card-label`; implementer's call, verified
  against the mockup's actual visual weight.
- `components/blocks/global-map.tsx:35` — `<h2 className="font-display
  text-section tracking-tightest-display uppercase">` renders "See our
  global locations" (block type `global_map`, default title at line 10,
  seed data at `scripts/seed-home-page.ts:136`).
- `components/blocks/contact-form-client.tsx:24` — `<h2 className="mb-8
  font-display text-section tracking-tightest-display uppercase">` renders
  "Leave us a message" (title default at `contact-form.tsx:12`).

Do **not** apply Font B anywhere else — a global swap would recreate the
same "everything looks the same" problem in the other direction. Font A
stays the default for every primary headline, card, nav, and tab.

**Completeness check for the implementer:** `grep -rl "font-display
text-section tracking-tightest-display uppercase" components/blocks/*.tsx`
finds 18 files sharing this exact class string (the four above, plus
`benefits-cards.tsx`, `accordion.tsx`, `feature-tiles.tsx`, `cta-band.tsx`,
`image-gallery.tsx`, `how-it-works.tsx`, `hero-page.tsx`, `news-feed.tsx`,
`product-hero.tsx`, `product-grid.tsx`, `recommendations.tsx`,
`video-embed-client.tsx`, `spec-table.tsx`, `split-feature.tsx`,
`team-directory.tsx`). This spec directly confirmed, against the actual
mockup pages, that `product-hero.tsx`, `product-grid.tsx`, `hero-page.tsx`,
`how-it-works.tsx`, `recommendations.tsx`, and `benefits-cards.tsx`'s
equivalent are correctly Font A ("PRODUCTS", "HOW DOES IT WORK?",
"BENEFITS", "RECCOMENDATIONS", "CONTACT US", product headlines all render
uppercase/angular in the mockup too). The remaining files
(`accordion.tsx`, `feature-tiles.tsx`, `cta-band.tsx`, `image-gallery.tsx`,
`news-feed.tsx`, `video-embed-client.tsx`, `spec-table.tsx`,
`split-feature.tsx`, `team-directory.tsx`) render headings this spec did
not directly cross-check against a mockup page (they weren't visible on
the 4 pages screenshotted for this audit, or the mockup doesn't show that
block). **The implementation pass must check each of these against the
actual mockup page it appears on before deciding Font A or Font B** —
do not assume either way from this list alone.

**3. Fix the two concrete non-font findings**: the stat-label
over-capitalization (`stat-grid.tsx`) and the duplicate "PRODUCTS" heading
(products listing page).

**4. Spacing/padding pass**, per page, against the mockup screenshots
already on file plus fresh mockup extracts as needed.

## Testing / verification

- `pnpm build && pnpm lint && pnpm exec tsc --noEmit` clean, per project
  convention.
- Visual comparison: screenshot home/products/product-detail/contact
  locally and compare side-by-side against the corresponding mockup page
  for each finding above — confirm resolved, confirm nothing else shifted.
- Confirm this session's motion work is untouched: scroll reveal, hover
  glow, hero eyebrow gradient sweep, carousel cross-fade, video button
  pulse all still function (these are markup/JS concerns, not styling, so
  a font/spacing pass shouldn't touch them — but verify rather than
  assume).
- Lighthouse on `/` and a product detail page — confirm no regression from
  adding a second font load (an extra `next/font/google` family is a small,
  known cost; watch it doesn't meaningfully move the performance score).
- `/styleguide` gets a small addition previewing Font B next to Font A, matching how every other primitive in this project is documented there.

## Non-goals (explicit, per user direction)

- No new visual direction, no mockup creation, no exploration of
  alternative brand directions.
- No changes to the six motifs or the palette.
- No changes to information architecture, page structure, or content
  beyond the two concrete bugs found (duplicate heading, over-capitalized
  stat unit).
