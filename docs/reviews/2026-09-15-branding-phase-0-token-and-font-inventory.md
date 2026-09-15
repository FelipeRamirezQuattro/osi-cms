# Branding module Phase 0 — token and font inventory

Date: 2026-09-15
Plan: `docs/superpowers/plans/2026-09-15-branding-module-and-block-theming.md` (Phase 0)
Gate commit: `2071d44` (public-site-ui-motion-redesign implementation; branch `main`, working tree clean at the start of this phase)

This document is the frozen baseline that later branding-module phases (1–9)
build from. It does not change any code, schema, or config.

---

## 0. Freeze confirmation

- Admin UI redesign: partially landed per the branding plan's own "Current
  status and phase sequencing" section — Phases 1 and 4 done and real,
  Phases 2/3/5 done in substance under different file names, Phase 6 in
  progress by a concurrent agent. Not a blocker for this Phase 0 (pure
  documentation, touches no files Phase 6 is editing).
- Public site redesign: Phases 0–9 and the code/verification portion of
  Phase 10 landed in `2071d44`. `pnpm check` (71 files / 577 tests),
  `pnpm build` (Next.js 16.3.4), 24/24 public axe checks, and 44 passed /
  4 skipped route-smoke checks are recorded in
  `docs/reviews/2026-09-15-public-ui-motion-redesign-handoff.md` and
  `docs/reviews/2026-09-15-public-redesign-baseline-and-reconciliation.md`.
- `git status` at the start of this phase: clean, on `main`, HEAD `2071d44`
  (see recent-commits list in the launching agent's git-status snapshot).

## 1. Visual baselines (disclosed deferral — no new screenshots captured)

**This section is a written citation of existing prose documentation, not
a literal image/screenshot capture.** Per this phase's brief, no new
Playwright/screenshot capture was run here (no dev server or browser
tooling available to this agent, and it would duplicate work the
branding module's own Phase 9 QA must redo anyway against a build that
actually has branding wired in). This phase's actual Acceptance line
("A checked token migration matrix exists and every public color/font
use is classified...") does not require a literal capture — only §§2–6
below are load-bearing for that. The two redesign review docs already
establish the final pre-branding visual state in enough prose detail to
serve as the written baseline this section cites in its place:

- `docs/reviews/2026-09-15-public-ui-motion-redesign-handoff.md` — outcome
  summary, main changes per surface (foundation, shell/nav, discovery,
  media/motion, forms/states), verification results, "files to start
  with" list.
- `docs/reviews/2026-09-15-public-redesign-baseline-and-reconciliation.md`
  — the full route/state matrix (home, product discovery/detail,
  industry/application, services/`[...slug]`, preview, news, resources,
  search, contact/forms, locations/directory, loading/error/404), the
  33-block-type inventory as it stood then (34 today — `form` was the
  block registered after that doc was written; see §3 below), and the
  Phase 9–10 verification outcome (22 axe checks, 577 unit tests, 35
  route/viewport combinations with no overflow).

**Explicitly deferred:** a fresh, exhaustive screenshot/Playwright pass
across home, product listing/detail, contact, search, news/resources,
every content block, 404/error, header/menu/footer, and preview is
deferred to the branding module's own Phase 9 ("Accessibility,
performance, visual regression, and handoff"), which needs to run that
pass anyway against a build that has the theme compiler and seeded OSI
branding wired in — capturing it twice (once here, against pre-branding
code, and again there) would not de-risk anything Phase 9 doesn't already
have to verify per its own acceptance criteria ("visual regression shows
no unintended change under the seeded OSI branding").

## 2. Token migration matrix

Every distinct public color/font usage found in `app/globals.css` and
across `components/blocks/*`, `components/layout/*`,
`components/ui/*` (the shared public primitives `Section`,
`public-primitives.tsx`, `gradient-text.tsx`, `arrow-button.tsx`,
`cta-breakout-bar.tsx`, `label-plate-card.tsx`, `hairline-grid.tsx`,
`duotone-image.tsx`, `marquee-strip.tsx`, `clipped.tsx`), and
`app/(site)/*`, `app/layout.tsx`, `app/global-error.tsx`. One row per
distinct token or usage pattern, classified `structural` /
`semantic` / `content-specific` / `intentionally fixed`.

### 2.1 Color tokens (`app/globals.css` `@theme`)

| Token | Value | Classification | Notes |
| --- | --- | --- | --- |
| `--color-osi-navy-900` | `#001b33` | semantic | Primary dark surface / "on-surface-dark" ink. Level-1 fallback value for the "Dark surface" semantic role. |
| `--color-osi-navy-800` | `#001c34` | semantic | Near-duplicate of navy-900 (1 step lighter) **on the public site** — but not dead: `app/admin/admin.css`'s `.admin-root` block (line 49) aliases `--color-osi-navy-800: var(--admin-primary)`, and three not-yet-migrated admin auth pages (`app/admin/login/login-form.tsx:18`, `app/admin/forgot-password/forgot-password-form.tsx:21,32`, `app/admin/reset-password/reset-password-form.tsx:91,110`) apply `bg-osi-navy-800` directly, relying on that alias to render the admin's own primary-blue tone rather than the real OSI navy hex — see §6 for the full admin-aliasing picture. Candidate for the *public* branding module to fold into a single "primary dark" swatch (it has no distinct public-site call site), but must stay declared in `app/globals.css` regardless, since the admin's compatibility bridge depends on the token existing. Flag for Phase 1 to confirm there is still no distinct *public* call site before excluding it from the public swatch set. |
| `--color-osi-navy-700` | `#04243d` | semantic | Secondary dark surface (DuotoneImage overlay `to-osi-navy-700`, hero scrim, label-plate-card image fallback gradient). Maps to "Secondary" role. |
| `--color-osi-navy-600` | `#133752` | semantic | Card/panel surface on navy (`benefits-cards.tsx`'s `bg-osi-navy-600/40`). Maps to a "surface preset" background, not a top-level role. |
| `--color-osi-steel-500` | `#234e7b` | semantic | Accent/structural-line color — hover glow rings (mission-cards, news-feed), hairline grid rule color, focus ring on product-grid search input, spec-table border tint via steel opacity. Maps to "Accent" or a secondary accent role. |
| `--color-osi-slate-400` | `#4c6880` | semantic | Muted meta text (news-feed post date, team-directory "no entries" message, recommendations subtitle). One more muted step than slate-300/200. |
| `--color-osi-slate-300` | `#576979` | semantic | "Muted text on light" role — used everywhere `data.background === "cream"` branches to the light-safe muted color (global-map, hero-full, product-hero, split-feature, quote-testimonial, spec-table `dt`, section lede, label-plate-card body, resource cards, footer/contact fallbacks where light). |
| `--color-osi-slate-200` | `#818f9b` | semantic | "Muted text on dark" role — the navy-safe counterpart to slate-300 (WCAG fix documented in the token comment itself). Used in the mirrored branch everywhere slate-300 is used on cream. |
| `--color-osi-cream-100` | `#f2e9de` | semantic | "Light surface" / page background. `.site-shell`'s `--site-surface` and the `background === "cream"` branch of `Section`. |
| `--color-osi-cream-200` | `#efe8dd` | semantic | No direct `bg-osi-cream-200`/`text-osi-cream-200` utility-class usage found in any component searched (public or admin) — but not an orphaned declaration: `app/admin/admin.css`'s `.admin-root` block (line 46) aliases `--color-osi-cream-200: var(--admin-surface-muted)`, repurposing the token itself as the admin's compatibility-bridge alias target even though no markup applies it as a class — see §6. Likely still reserved for a future public light-surface variant on top of that. Flag for Phase 1 to confirm before seeding as a distinct *public* swatch vs. dropping (dropping it from the public palette would still require updating/removing the admin alias line separately, since that alias would otherwise point at a token no longer declared). |
| `--color-osi-sand-300` | `#d0c0a7` | semantic | Secondary neutral accent — pill border in global-map's country list, MediaFrame's placeholder background, image-gallery thumbnail placeholder background. |
| `--color-osi-gold-500` | `#e2902a` | semantic | "Accent" role, navy-safe only (see contrast comment in globals.css). Universal CTA color (`solid-gold` button variant, breakout bar, focus-within ring on search field, active-route underline, footer column headings, hero eyebrow gradient stop). |
| `--color-osi-gold-400` | `#f0a93d` | semantic | Gold hover/lighter step, navy-safe. `solid-gold` hover state, `GradientText`'s second gradient stop, announcement-bar link hover, mega-menu active-route gold. |
| `--color-osi-gold-700` | `#885619` | semantic | Cream-safe gold — the contrast-aware pair CLAUDE.md's Hardening section documents. Used in every `data.background === "cream" ? ... : ...` gold branch (contact-details heading accent via rich-text `marker:text-osi-gold-700`, hero-page eyebrow, product-hero eyebrow, stages-carousel stage label, quote-testimonial attribution, resource card kind label, label-plate-card "Learn more" arrow). |
| `--color-osi-white` | `#ffffff` | semantic | "Text on dark" role and light-plate surfaces (product-hero fallback plate, image-gallery lightbox chrome, global-map country-pill panel). |
| Non-token literal `#fffaf4` (`--site-surface-raised`) | `#fffaf4` | semantic | Raised light surface (cards on cream), defined only inline in `.site-shell`, not promoted to a `@theme` token. Candidate for a real Level-1 swatch if the branding module wants it selectable — currently it is derived, not independently configurable. |
| `:focus-visible` outline `#0066ff` | `#0066ff` | **intentionally fixed** | WCAG 2.1 AA universal focus ring — CLAUDE.md's Hardening section: deliberately off-brand blue because neither navy nor gold clears 3:1 against both navy and cream simultaneously. Must never become a brand-selectable token; the branding contract's own "Focus indicator" semantic role should resolve to this exact fixed value unless/until a future brand color is proven to clear both contrast pairs. |
| `app/global-error.tsx` inline styles `#001b33` / `#e2902a` / `#ffffff` | same as navy-900/gold-500/white | **intentionally fixed** | Root-layout-failure fallback. Cannot use CSS variables, Tailwind tokens, or `next/font` — it replaces `<html>`/`<body>` entirely when the root layout itself throws, so these must stay hardcoded literals independent of any theme system, brand publication state, or database availability. This is the "final safety net below the fallback" — even a corrupted or absent Level-1 fallback config must not be able to break this file. |
| `StatusMessage` error/success colors (`red-700`/`red-50`/`red-950`, `emerald-700`/`emerald-50`/`emerald-950`) | Tailwind defaults | **intentionally fixed** | Semantic error/success system colors, not OSI brand colors. The branding contract's "Error/success/warning/information" roles should be seeded from these exact values (Level-1 fallback) but are separately govern-able — these are *system* semantics, historically not brand-configurable in most design systems, yet the plan does list them as manageable roles. Recommendation for Phase 1: seed them from these exact hex/Tailwind values and keep them out of the "12 active swatches" cap discussion — see §4. |

### 2.2 Font tokens

| Token | Current value | Classification | Notes |
| --- | --- | --- | --- |
| `--font-display` (`font-display`) | Orbitron via `--font-display-source` | semantic | "Display" typography role. Short hero/product-name/stat moments only per CLAUDE.md's typography-roles note (hero eyebrow/headline when short, product-hero title, stat-grid values, section-heading small labels, footer/header wordmark). |
| `--font-editorial` (`font-editorial`) | Montserrat via `--font-editorial-source` | semantic | "Heading" role (per the plan's 4-role model — CLAUDE.md calls this "editorial" but the plan's typography-roles section names it "Heading"). Used for every `h2`/`h3` section/article/card heading site-wide, plus long hero titles that opt out of Orbitron. |
| `--font-display-soft` | alias of `--font-editorial-source` | structural | Documented as "legacy alias kept while public blocks migrate to the explicit name" (globals.css comment). No live call site found in the searched components — grep for `font-display-soft` outside globals.css and admin.css returned nothing. Should be **dropped**, not migrated, once Phase 3 confirms zero remaining references; not a role the branding module needs to expose. |
| `--font-body` (`font-body`) | Poppins via `--font-body-source` | semantic | "Body" role plus most interface/label uses today (buttons, form labels, nav links) — CLAUDE.md's 4-role model calls for a distinct "Interface/label" role eventually, but today `font-body` covers both body copy and interface text; see §5 (font catalog) role note. |
| `admin.css` `--admin-font` override of all four `--font-*` vars inside `.admin-root` | `ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | **intentionally fixed** | Confirms the plan's non-goal ("Recoloring or re-fonting the admin interface from public branding settings") is already true today at the CSS-variable level — `.admin-root` unconditionally wins for admin routes regardless of what the public theme compiler ever emits into `:root`/`.public-site`. The branding module must preserve this override exactly, not weaken it. |

### 2.3 Structural / layout tokens (not brand-configurable)

| Token(s) | Classification | Notes |
| --- | --- | --- |
| `--text-hero`, `--text-section`, `--text-card-label`, `--text-small-label` (+ line-heights) | structural | Fluid type scale (clamp-based sizes). The plan explicitly scopes typography roles to *font selection*, not size/line-height/weight/tracking ("Existing font size, line height, weight, capitalization, and tracking remain component/design-system responsibilities" — Typography roles section). |
| `--tracking-tightest-display`, `--tracking-wide-display`, `--tracking-wide-label` | structural | Letter-spacing, same reasoning as above. |
| `--ease-osi`, `--animate-*` (float/gradientShift/marquee/spin-slow/pulse-glow*) | structural | Motion tokens — not colors or fonts; owned by `lib/motion/variants.ts`'s `EASE_OSI`/`publicMotion` per CLAUDE.md's Motion section, which explicitly forbids a second easing curve. Out of scope for branding entirely (confirmed: `lib/motion/variants.ts` holds no color/font values, only timing/easing/spring constants — see §6). |
| `.site-shell` geometry (`--site-radius-*`, `--site-container`, `--site-reading-width`, `--site-duration-*`, `--site-ease`) | structural | Layout/motion geometry, not brand color/font. `--site-ease` duplicates `--ease-osi`'s curve value as a plain CSS var for use in the dialog transitions in the same file — not a second curve, same numbers. |
| `--site-border`, `--site-border-on-dark` (`color-mix(...)`) | semantic (derived) | These are *derived* from `--color-osi-navy-900` / white via `color-mix()`, not independent tokens. If the branding module changes the "Border on light/dark" semantic role's source swatch, these derivations need to move from a hardcoded `color-mix(in srgb, var(--color-osi-navy-900) ...)` to reference the resolved role variable instead — flag for Phase 3 (semantic migration). |
| Clip-path utilities (`clip-notch-*`, `diagonal-seam-*`) | structural | Pure geometry (Motif 1/4), no color or font. |
| `body:has(dialog[open]) { overflow: hidden }`, `.site-dialog` transition timings | structural | Behavior/interaction, not visual identity. |

### 2.4 Content-specific usages

| Usage | Classification | Notes |
| --- | --- | --- |
| `DuotoneImage`'s navy multiply tint + grayscale (`intensity` prop, default 0.55) | semantic (mechanism) / content-specific (the photo itself) | The *tint color* (`bg-osi-navy-900`) is semantic (an "Accent surface tint" concept the branding module could expose), but the underlying photography is per-content and never a brand token. |
| Product diagram colors ("red flow path", "green flow path" — referenced in `product-hero.tsx`'s comment) | content-specific | Baked into uploaded technical diagram images; explicitly *not* run through `DuotoneImage` for exactly this reason (documented in the file). Out of scope for any token system — these are legacy/product content, never brand-configurable. |
| `resolveMediaUrl()`-served images generally (hero backgrounds, product photos, logos-in-content) | content-specific | Per-page/per-product content, governed by `lib/media.ts`, not branding. |
| Rich-text body copy colors (none set — inherits `Section`'s `bg`/`text` pair) | content-specific | Tiptap output only controls structure (bold/italic/links/headings), never color — confirmed in `rich-text.tsx`; the `marker:text-osi-gold-700` list-bullet color is the one semantic exception (see §2.1 gold-700 row). |

## 3. Block appearance capability inventory

All 34 currently registered block types (`lib/blocks/registry.ts`) — more
than the "~26" figure in this phase's brief and in CLAUDE.md's "Block
registry (Phase 3, done)" section, which describes the original master-
prompt count before `form`, `resource_list`, and others were added later
in the CMS-remediation track. Every block uses the shared `<Section>`
primitive (`components/ui/section.tsx`) for its `background`/
`spacingTop`/`spacingBottom`/`anchorId` handling — confirmed by grep; the
four blocks with a client-split file (`contact_form`, `form`,
`stages_carousel`, `video_embed`) call `<Section>` from their
`-client.tsx` half, not their schema-holding half.

Proposed `appearance` shape per the plan:
`{ surface: "none"|"inherit"|"selectable", accent: boolean, typographySlots: Array<"display"|"heading"|"body"|"label"> }`.
Every block below proposes `surface: "selectable"` unless noted, since
every block accepts the common `background` enum today — the real
per-block differentiation is in `accent` and `typographySlots`, which is
exactly where blocks currently diverge (some hardcode fonts/colors with
no admin control at all; the classification below records that gap for
Phase 4 to close).

| Block type | Current background handling | Hardcoded font/color classes found | Proposed `appearance` | Notes |
| --- | --- | --- | --- | --- |
| `hero_full` | common enum, but always paints its own full-bleed navy-scrim `DuotoneImage` regardless of `background` value (documented in-file) | `font-display`/`font-editorial` (headline switch), `GradientText` (eyebrow, navy-only), `text-osi-white` unconditional | surface: selectable (but see note); accent: true; slots: [display, heading, body] | `background` here does NOT change the visible surface color today — it only feeds the `subhead` text-color branch. Phase 4 should decide whether to keep `background` purely as a text-contrast hint for this block or add a distinct "scrim intensity" control instead of a real surface swap. |
| `hero_page` | common enum, real surface swap | `font-editorial` (title), `GradientText`/`text-osi-gold-700` (eyebrow, background-branched) | surface: selectable; accent: true; slots: [heading, label] | Standard pattern. |
| `product_hero` | common enum, real surface swap | `font-display` (title), `GradientText`/`text-osi-gold-700` (eyebrow), `text-osi-slate-300`/`200` (paragraphs) | surface: selectable; accent: true; slots: [display, body, label] | Fixed-structure block (not in the page-block picker) — see CLAUDE.md's "Product detail pages don't use page_blocks." Still needs capability metadata since Phase 4's registry-driven resolution covers it the same way. |
| `section_heading` | common enum | `font-editorial` (title) only — no accent color at all | surface: selectable; accent: false; slots: [heading] | Simplest content block; a fully honest candidate for "no accent control." |
| `feature_tiles` | common enum | `font-editorial` (title); tiles render via `LabelPlateGrid`→`LabelPlateCard` which hardcodes `text-osi-navy-900`/`text-osi-gold-700` internally regardless of the block's own `background` | surface: selectable; accent: true (via CTA); slots: [heading, body] | `LabelPlateCard` (shared component) always renders on its own light "raised" card chip, independent of the parent block's background — same "technical plate" pattern seen in `stages_carousel`. This card-level surface is a strong candidate for a dedicated "technical plate" surface preset that block-level `background` doesn't currently touch. |
| `stat_grid` | common enum, background-branched gold/slate | `font-display` (values), `HairlineGrid` (steel-500 lines) | surface: selectable; accent: true; slots: [display, label] | |
| `mission_cards` | common enum | `font-editorial` (title); `ArrowButton` variant branches on background | surface: selectable; accent: true (via CTA); slots: [heading] | |
| `split_feature` | common enum, background-branched slate | `font-editorial` (title); `CtaBreakoutBar` (always gold, unconditional) | surface: selectable; accent: true; slots: [heading, body, label] | `CtaBreakoutBar` is always solid gold regardless of `background` — an explicit "accent-always-gold" primitive, not background-derived; flag as a case where "accent" may need to stay a fixed motif rather than a swatch picker if the client wants the breakout-bar motif preserved untouched. |
| `link_columns` | common enum | `font-editorial` (title); plain `hover:underline` links, no accent color | surface: selectable; accent: false; slots: [heading] | |
| `global_map` | common enum, background-branched slate | `font-editorial` (title); always-white pill panel (`bg-osi-white/95`) regardless of `background`; `CtaBreakoutBar` (always gold) | surface: selectable; accent: true; slots: [heading, label] | Same "always-white inner panel" pattern as `feature_tiles`/`stages_carousel` — a light surface island inside a possibly-navy section. |
| `news_feed` | common enum | `font-editorial` (headings); hardcoded `text-osi-slate-400` for the date/kind meta line, not background-branched | surface: selectable; accent: false; slots: [heading, label] | Meta-text color doesn't branch by `background` — potential contrast gap if ever placed on `navy` (slate-400 is darker than slate-200, the navy-safe muted color); flag for Phase 4's compatibility pass. |
| `product_grid` | common enum | Delegates to `ProductGridClient`, which independently hardcodes `text-osi-slate-300`, `bg-osi-navy-900`, `text-osi-gold-700`/`bg-osi-gold-500` for filter chips/active states, `focus:border-osi-steel-500` | surface: selectable; accent: true; slots: [label] | Fixed-structure listing page block; the interactive filter chrome is the most color-dense client component in the registry (11 `bg/text/border-osi-*` occurrences) and is not background-aware at all — always assumes a light/cream context. Real risk if `background: navy` is ever selected for this block; Phase 4 should decide whether to hide the surface control for this block entirely (`surface: "none"`) rather than offer a control that visibly breaks. |
| `recommendations` | common enum | `font-editorial` (title); hardcoded `text-osi-slate-400` subtitle, not background-branched | surface: selectable; accent: false; slots: [heading, label] | Delegates product cards to `RecommendationsClient` (not read in full here — flag for Phase 4 to audit directly). |
| `stages_carousel` | common enum for the `<Section>` wrapper, but the stage card itself is **always** rendered on a fixed light "surface-raised" plate (`bg-[var(--site-surface-raised)] text-osi-navy-900`) regardless of the section's `background` | `font-display` (stage counter, background-branched gold), `font-editorial` (stage title) | surface: selectable (section) + fixed light card (not controllable); accent: true; slots: [display, heading, body, label] | Same "technical plate" pattern as `feature_tiles`/`global_map` — a strong signal that a dedicated "technical plate" surface preset (light, fixed) is a real, recurring motif distinct from the block's own selectable background, not a one-off. |
| `how_it_works` | common enum accepted in schema, **but Render never branches on `data.background`** — body copy is hardcoded `text-osi-slate-200` (the navy-safe muted color) unconditionally | `font-editorial` (title) | surface: selectable; accent: false; slots: [heading, body] | **Contrast gap**: if an editor ever sets this block's `background` to `cream`, the body text stays slate-200 (only 3.07:1 on... wait, slate-200 is used here regardless, and slate-200's contrast was tuned for navy — on cream it will be a light gray-blue that likely fails AA). Not currently exploitable in practice because this block is only used by the fixed product-detail template with `background: "navy"` in its defaults and no admin `background` control exposed via the generic page-block picker — but the schema alone would allow it. Flag for Phase 4/8's compatibility adapter to either add the missing branch or lock this block's `surface` to a fixed value. |
| `benefits_cards` | common enum, but individual cards always render `bg-osi-navy-600/40` (a fixed dark panel) regardless of `background` | `font-editorial` (item titles), `text-osi-slate-200` (unconditional, same latent gap as `how_it_works`) | surface: selectable (section) + fixed dark card; accent: false (border-only steel tint); slots: [heading, body] | Fixed-structure product-detail block; same latent cream-background gap as `how_it_works` if `background` were ever changed from its `navy` default. |
| `video_embed` | common enum | none — pure structural chrome (play button uses `bg-osi-white/90`/`text-osi-navy-900`, fixed regardless of background) | surface: selectable; accent: false; slots: [heading] | |
| `contact_form` | common enum | `font-editorial` (title); form field styling comes from `PUBLIC_FIELD_CLASS`/etc. in `public-form-styles.ts` (not read in full — flag for Phase 3/4 to confirm those constants are semantic, not raw hex) | surface: selectable; accent: true (submit button); slots: [heading, label] | |
| `contact_details` | common enum, background-branched borders/text in the "map unavailable" fallback | `font-editorial` (headings) | surface: selectable; accent: false; slots: [heading, label] | |
| `cta_band` | common enum | `font-editorial` (headline); `ArrowButton variant="solid-gold"` always — the one block whose entire purpose is a fixed gold CTA | surface: selectable; accent: true (fixed to gold today — an explicit "always accent" case, not optional); slots: [heading] | |
| `rich_text` | common enum | `font-editorial` (H2/H3 from Tiptap doc); `marker:text-osi-gold-700` (list bullets, hardcoded, not background-branched) | surface: selectable; accent: true (bullet color only); slots: [heading, body] | Bullet-marker color is hardcoded to the cream-safe gold-700 regardless of `background` — a real latent contrast gap if this block is ever set to `background: "navy"` (2.12:1 gold-500 problem doesn't apply since gold-700 is even darker/less visible on navy). Flag for Phase 4. |
| `accordion` | common enum | `font-editorial` (item titles/section title); no accent color | surface: selectable; accent: false; slots: [heading, body] | |
| `logo_strip` | common enum | `font-display` (text-fallback logo names) | surface: selectable; accent: false; slots: [label] | Per the plan's block-family table: "label only when fallback names render" — confirmed exactly true here (image logos carry no text styling at all). |
| `team_directory` | common enum | `font-editorial` (person name), `font-display` (department label) | surface: selectable; accent: false; slots: [heading, label] | |
| `image_gallery` | common enum | `font-editorial` (title); delegates thumbnail/lightbox chrome to `ImageGalleryClient`, which hardcodes `bg-osi-navy-900` (lightbox chrome, fixed dark regardless of background), `bg-osi-sand-300/30` (thumbnail placeholder) | surface: selectable (grid) + fixed dark lightbox chrome; accent: false; slots: [heading] | Lightbox is intentionally always-dark (a modal/overlay convention, not a brand surface) — recommend keeping it out of `surface: selectable` scope explicitly rather than letting it silently ignore an override. |
| `spec_table` | common enum | `text-osi-slate-300` (label column, not background-branched) | surface: selectable; accent: false; slots: [heading, body] | Same latent-gap pattern as `how_it_works`/`benefits_cards`/`rich_text`'s bullets — hardcoded slate-300 (cream-safe) with no navy branch, but this block's real-world default is `cream`, so lower risk in practice. |
| `image` | common enum | none — pure media block, no accent/heading text at all | surface: selectable; accent: false; slots: [] (caption/credit are content-specific text, plain `opacity-70`, no brand color) | Closest thing to a pure "image-only" block per the plan's capability-model examples. |
| `embed` | common enum | none | surface: selectable; accent: false; slots: [] | Sandboxed iframe chrome only; no brand text at all. |
| `columns` | common enum, background-branched `ArrowButton` variant for the `cta`-type column | `font-editorial` (text-type heading) | surface: selectable; accent: true (cta column only); slots: [heading, body] | |
| `quote_testimonial` | common enum, background-branched gold/slate | `font-editorial` (blockquote) | surface: selectable; accent: true; slots: [heading (quote), body (attribution)] | Matches the plan's block-family table exactly ("quote or body/attribution"). |
| `button_group` | common enum, background-aware via `ArrowButton` variants | none directly — delegates entirely to `ArrowButton` | surface: selectable; accent: true; slots: [label] | |
| `resource_list` | common enum | `font-editorial` (title); delegates filter/card chrome to `ResourceListClient`→ shares `resource-browser-client.tsx`, which hardcodes `text-osi-slate-300`, `text-osi-gold-700` (kind label, not background-branched), light-only card styling | surface: selectable; accent: true (kind label, fixed cream-safe gold only); slots: [heading, label] | Same "assumes light context" risk class as `product_grid`'s filter chrome. |
| `shared_section` | `background`/`spacingTop`/`spacingBottom` accepted in schema but **inert by design** (only `anchorId` is honored — documented in-file) | n/a — recurses into child blocks via `BlockRenderer` | surface: **inherit** (from referenced content, per the plan's own block-family table); accent: none at reference level; slots: none | Exact match for the plan's "Shared section reference" row — already built exactly the way the plan specifies, no change needed beyond wiring real appearance metadata through in Phase 4. |
| `form` | common enum | `font-editorial` (title); shares `public-form-styles.ts` constants with `contact_form` | surface: selectable; accent: true (submit button); slots: [heading, label] | |

### 3.1 Cross-cutting capability observations for Phase 4

1. **"Technical plate" is a real, recurring pattern**, not a one-off:
   `feature_tiles` (via `LabelPlateCard`), `stages_carousel`,
   `global_map`'s pill panel, and `image_gallery`'s lightbox chrome all
   render a fixed light (or fixed dark, for the lightbox) inner surface
   *independent of* the block's own `background` field. The plan's
   surface-preset model (§"Surface presets") should almost certainly
   seed a "technical plate" preset from exactly these values so Phase 4
   can point these components at a real token instead of a hardcoded
   class.
2. **Several blocks hardcode a background-appropriate color without
   actually branching on `data.background`** — `news_feed` and
   `recommendations` (slate-400 meta text), `how_it_works` and
   `benefits_cards` (slate-200 body text), `rich_text` (gold-700 bullet
   markers), `spec_table` (slate-300 label). Each of these currently
   works only because the block's *default* `background` (and in most
   cases its only real-world usage) matches the hardcoded color's safe
   side. CLAUDE.md's Hardening section says to "grep for `data.background
   === "cream"` to find every instance" when adding new accent-on-
   configurable-background code — these five are exactly the instances
   that check *didn't* cover, because they don't need the branch today.
   Phase 4's compatibility adapter must decide, per block, whether to (a)
   add the missing branch, (b) restrict `surface` to a fixed value so the
   admin can never select the unsafe combination, or (c) leave as-is with
   a documented constraint. This is a **finding**, not a Phase-0 fix.
3. **`hero_full` and `cta_band` use `background`/`accent` for a purpose
   other than a free surface swap** — `hero_full`'s `background` only
   changes text-contrast branching (the visible surface is always the
   photo), and `cta_band`'s gold button is not actually optional today.
   Phase 4 should treat these as "surface: selectable but semantically
   narrower than the general case" rather than force-fitting the generic
   model.

## 4. Final OSI fallback configuration (Level 1 seed values)

These are the exact values that must become the seeded "safe built-in
OSI fallback" so the default rendered site is pixel-identical to today
after the branding module ships.

### 4.1 Palette (12-swatch cap per the plan — exactly 12 real swatches exist today, a clean fit)

| Proposed stable ID | Name | Hex | Source token |
| --- | --- | --- | --- |
| `osi-navy-900` | Primary navy | `#001B33` | `--color-osi-navy-900` |
| `osi-navy-700` | Navy (secondary) | `#04243D` | `--color-osi-navy-700` |
| `osi-navy-600` | Navy panel | `#133752` | `--color-osi-navy-600` |
| `osi-steel-500` | Steel accent | `#234E7B` | `--color-osi-steel-500` |
| `osi-slate-400` | Slate (meta text) | `#4C6880` | `--color-osi-slate-400` |
| `osi-slate-300` | Slate (muted on light) | `#576979` | `--color-osi-slate-300` |
| `osi-slate-200` | Slate (muted on dark) | `#818F9B` | `--color-osi-slate-200` |
| `osi-cream-100` | Cream surface | `#F2E9DE` | `--color-osi-cream-100` |
| `osi-sand-300` | Sand accent | `#D0C0A7` | `--color-osi-sand-300` |
| `osi-gold-500` | Signal gold (on dark) | `#E2902A` | `--color-osi-gold-500` |
| `osi-gold-400` | Signal gold (hover, on dark) | `#F0A93D` | `--color-osi-gold-400` |
| `osi-gold-700` | Signal gold (on light) | `#885619` | `--color-osi-gold-700` |

Deliberately excluded from the 12-swatch active *public branding*
palette (per §2.1's flags): `osi-navy-800` (`#001c34`, no distinct
public-site call site — a near-duplicate of navy-900) and `osi-cream-200`
(`#efe8dd`, no direct utility-class call site anywhere). **Correction from
this document's first draft**: neither token is actually dead — both are
referenced today, deliberately, by `app/admin/admin.css`'s `.admin-root`
compatibility-bridge aliasing (`--color-osi-navy-800: var(--admin-primary)`,
`--color-osi-cream-200: var(--admin-surface-muted)`), and `osi-navy-800`
is additionally applied directly by three not-yet-migrated admin auth
pages (see §2.1's rows and §6). That usage is an *admin-internal*
styling mechanism, not a public-brand role, so the recommendation to
exclude both from the public 12-swatch palette still holds — but
`app/globals.css` must keep declaring both tokens (with their current
values) regardless of whether the branding module ever exposes them as
selectable public swatches, since removing the underlying CSS variable
would break the admin's alias target, not just an unused public token.
`osi-white` (`#ffffff`) and the raised-surface `#fffaf4` are recommended
as *derived* values (a "Text on dark" role resolving to pure white; a
"Light surface raised" role resolving to the near-white) rather than
counted against the 12-swatch cap, since the cap's purpose (per the
plan) is keeping *selection* usable, not counting every derived value.

### 4.2 Semantic role → swatch mapping (Level 1 seed)

| Role | Resolves to |
| --- | --- |
| Primary | `osi-navy-900` |
| Secondary | `osi-navy-700` |
| Accent | `osi-gold-500` (dark surfaces) / `osi-gold-700` (light surfaces) — see §4.4 note on this role needing a light/dark pair, not one swatch |
| Light surface | `osi-cream-100` |
| Dark surface | `osi-navy-900` |
| Text on light | `osi-navy-900` |
| Text on dark | `osi-white` (derived) |
| Muted text on light | `osi-slate-300` |
| Muted text on dark | `osi-slate-200` |
| Border on light | `color-mix(in srgb, osi-navy-900 16%, transparent)` (currently `--site-border`) |
| Border on dark | `color-mix(in srgb, white 18%, transparent)` (currently `--site-border-on-dark`) |
| Focus indicator | `#0066FF` (intentionally fixed — not a swatch; see §2.1) |
| Error | Tailwind `red-700`/`red-50`/`red-950` triplet (`StatusMessage` error tone) |
| Success | Tailwind `emerald-700`/`emerald-50`/`emerald-950` triplet (`StatusMessage` success tone) |
| Warning / Information | **Gap** — no current usage of a distinct warning or info tone was found anywhere in the searched public components (`StatusMessage`'s `tone` union is only `"info" | "success" | "error"`, and its "info" tone reuses `osi-steel-500`/navy, not a distinct amber/blue). Phase 1 needs to pick real values for these two roles since there is no existing pixel-identical baseline to preserve — document that choice in `docs/DECISIONS.md` when made, it is new territory, not a migration. |

### 4.3 Surface presets (Level 1 seed, matching "primary dark, reading light, technical plate, transparent/inherit")

| Preset | Background | Text | Muted text | Accent | Border | Mode |
| --- | --- | --- | --- | --- | --- | --- |
| Primary dark | `osi-navy-900` | `osi-white` | `osi-slate-200` | `osi-gold-500` | Border on dark | solid |
| Reading light | `osi-cream-100` | `osi-navy-900` | `osi-slate-300` | `osi-gold-700` | Border on light | solid |
| Technical plate | `#fffaf4` (site-surface-raised) / `osi-white` for the lightbox-chrome variant | `osi-navy-900` (light plate) / `osi-white` (dark lightbox chrome) | `osi-slate-300` | `osi-gold-700` | Border on light | solid — see §3.1 note #1; this preset needs **two** variants (light plate vs. dark lightbox chrome) since both exist today as fixed, un-configurable surfaces |
| Transparent / inherit | `transparent` | inherits ambient `.site-shell` ink | inherits | n/a | n/a | transparent |

### 4.4 Typography roles (Level 1 seed)

| Role | Current font | Font-loading today |
| --- | --- | --- |
| Display | Orbitron, weights 500/700, Latin subset | `next/font/google`, `variable: --font-display-source`, `subsets: ["latin"]` |
| Heading | Montserrat, weights 500/600, Latin subset | `next/font/google`, `variable: --font-editorial-source` |
| Body | Poppins, weights 400/500/600, Latin subset | `next/font/google`, `variable: --font-body-source` |
| Interface/label | **Currently unassigned as a distinct role** — today's code uses `font-body` (Poppins) for essentially all interface/label text (buttons, nav, form labels) per §2.2's note. Level 1 seed should explicitly assign Interface/label → Poppins too, so the 4-role model matches current pixel output exactly (assigning it a *different* font than Body would be a visual change, not a preservation). |

### 4.5 Primary logo (Level 1 seed)

There is no logo asset today — the "logo" is the hardcoded text wordmark
`OSI` + a gold period, rendered identically in three places:
`components/layout/header.tsx` (line 19), `components/layout/footer.tsx`
(line 38), and `components/layout/mega-menu-client.tsx` (line 180, inside
the full-menu dialog). All three use `font-display text-xl font-bold
tracking-wide-display uppercase` for "OSI" plus `text-osi-gold-500` for
the period. Per the plan's Primary Logo section ("If no logo is selected
or the asset fails, render the current accessible OSI text wordmark
fallback"), **this exact three-location text treatment is the Level-1
fallback to preserve**, not a placeholder to discard — Phase 5+ should
wire the branding module's logo picker to fall back to precisely this
markup/class combination when no media asset is published.

## 5. Font catalog decision

Initial vetted catalog — 9 entries, all currently available via
`next/font/google` (self-hosted at build time, no runtime external
request) so the loading-strategy guidance ("only published selections
requested, `font-display: swap`/`optional`, preload only the genuinely
critical face") can be satisfied the same way `app/layout.tsx` already
satisfies it for the OSI trio. Every named Google Fonts family below is
published under the SIL Open Font License 1.1 per Google Fonts' own
catalog metadata — **flagged for Phase 1/2 to re-verify against the
actual `OFL.txt` bundled with each font at implementation time**, since
this document does not fetch or inspect license files itself.

| Key | Family + fallback stack | Source / license | Allowed roles | Loading strategy | Status |
| --- | --- | --- | --- | --- | --- |
| `orbitron` | `"Orbitron", sans-serif` | Google Fonts, SIL OFL 1.1 — already in this project (`app/layout.tsx`) | Display | `next/font/google`, weights 500/700, `latin`, `display: swap` (current: no explicit `display` option set — defaults to `swap` per `next/font` docs; confirm at Phase 2) | available (OSI default) |
| `montserrat` | `"Montserrat", sans-serif` | Google Fonts, SIL OFL 1.1 — already in this project | Heading | `next/font/google`, weights 500/600, `latin` | available (OSI default) |
| `poppins` | `"Poppins", sans-serif` | Google Fonts, SIL OFL 1.1 — already in this project | Body, Interface/label | `next/font/google`, weights 400/500/600, `latin` | available (OSI default) |
| `rajdhani` | `"Rajdhani", sans-serif` | Google Fonts, SIL OFL 1.1 (not yet in this project — flagged for confirmation before first real use) | Display, Heading | `next/font/google`, weights 500/600/700, `latin`, load only if selected | available — industrial/geometric alternative to Orbitron (narrower, less "techno," reads better at small display sizes than Orbitron does) |
| `fraunces` | `"Fraunces", serif` | Google Fonts, SIL OFL 1.1 (not yet in this project) | Heading, Display (large editorial headlines only) | `next/font/google`, weight 600 + italic optional, `latin`, load only if selected | available — editorial serif alternative, for a client who wants a warmer/more traditional heading face than Montserrat |
| `source-sans-3` | `"Source Sans 3", sans-serif` | Google Fonts, SIL OFL 1.1 (Adobe-originated, not yet in this project) | Body, Interface/label | `next/font/google`, weights 400/600, `latin`, load only if selected | available — humanist sans alternative to Poppins (more neutral/less geometric warmth) |
| `inter` | `"Inter", sans-serif` | Google Fonts, SIL OFL 1.1 (not yet in this project) | Heading, Body, Interface/label | `next/font/google`, weights 500/600, `latin`, load only if selected | available — neutral/UI-workhorse sans, the "safe default" alternative across every non-display role |
| `system-sans` | `ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` | System stack, no license (no font file shipped) | Heading, Body, Interface/label | none — zero network request, zero CLS risk, instant paint | available — the safe zero-cost fallback the plan explicitly requires ("Include system-sans and system-serif fallbacks") |
| `system-serif` | `ui-serif, Georgia, Cambria, "Times New Roman", serif` | System stack, no license | Heading, Display (editorial contexts) | none | available — serif counterpart to `system-sans` |

Notes:

- `--font-display-soft` (the legacy alias) is not a catalog entry — it is
  a code-level compatibility shim (see §2.2) that Phase 3 should retire,
  not a font choice an administrator picks from.
- No arbitrary font-file upload is proposed, consistent with the plan's
  non-goal; every catalog entry is either already vetted Google Fonts
  (self-hosted via `next/font/google`, no external request at runtime) or
  a zero-file system stack.
- Rajdhani/Fraunces/Source Sans 3/Inter are **not currently used anywhere
  in this codebase** — they are proposed net-new catalog entries per the
  plan's requirement for "a restrained set of readable alternatives
  across industrial/geometric, editorial, humanist, and neutral
  families." A developer adding them to the real code-owned font
  registry in Phase 2 should pull the same subset/weight discipline
  `app/layout.tsx` already applies to the OSI trio (only the weights
  actually used, `latin` subset only, until a real content need expands
  that).

## 6. Current public theme payload and font-loading behavior

- **Theme payload today**: none — there is no runtime-resolved theme
  object of any kind. Every color/font value is a static Tailwind
  `@theme` token compiled at build time from `app/globals.css`; nothing
  is read from the database, resolved per-request, or injected as
  inline CSS custom properties beyond the fixed `--site-*` values
  `.site-shell` sets unconditionally. This is the "no branding module
  yet" state the plan's own audit already established — confirmed here
  by direct inspection rather than assumed.
- **Font loading**: three `next/font/google` calls in `app/layout.tsx`
  (Orbitron 500/700, Montserrat 500/600, Poppins 400/500/600, all
  `subsets: ["latin"]`), each bound to a CSS variable
  (`--font-display-source`/`--font-editorial-source`/`--font-body-source`)
  consumed by `app/globals.css`'s `@theme` block. All three load
  unconditionally on every request regardless of which typography roles
  a given page actually uses — there is no per-page or per-block
  conditional loading today, consistent with there being no admin-
  selectable font system yet. The public redesign handoff doc notes
  "Unused Orbitron/Montserrat font weights and italic files were
  removed" as a Phase 9–10 finding of that prior plan — i.e. the current
  weight list is already trimmed to real usage, which is the correct
  starting point for Phase 2's "only used font families/weights load on
  public pages" requirement.
- **`lib/motion/variants.ts`**: confirmed to hold no color or font
  values — only `EASE_OSI` (a cubic-bezier array), `springTransition`,
  `publicMotion` (pure numeric timings), `disclosureVariants`/
  `fadeRiseVariants`/`staggerContainerVariants` (opacity/`y`/timing
  Framer Motion variants), and the two `REVEAL_VIEWPORT*` intersection-
  observer configs. Out of scope for the branding module entirely, as
  expected.
- **Admin isolation — font: complete. Color: partial, and worth a closer
  look than this document's first draft gave it.** `app/admin/admin.css`'s
  `.admin-root` block unconditionally redefines `--font-display`,
  `--font-editorial`, `--font-display-soft`, and `--font-body` to a single
  `--admin-font` system stack, and `font-family: var(--admin-font)` on
  `.admin-root` itself. That part is a hard, total CSS-variable override:
  any future public theme compiler emitting different font values into
  `:root` cannot leak into `/admin/*`, because the admin's own
  more-specific rule always wins for anything rendered inside
  `.admin-root`.

  Color is a different picture. **This document's first draft claimed "no
  admin file was found referencing any `--color-osi-*` token or
  `bg-osi-*`/`text-osi-*` utility class" — that claim was wrong** (caught
  in task review, not by this document's own self-review sweep, which
  had scoped itself to `components/ui/*` and `app/(site)/**/*.tsx` and
  never swept `app/admin/*` — see §8.1's corrected scope note). A repo-wide
  sweep of `app/admin/**/*.tsx` finds `osi-*`-prefixed Tailwind utility
  classes used extensively — not just in the three auth pages, but across
  most of the admin's older dashboard screens (`navigation/`,
  `audit-log/`, `submissions/`, `users/`, `shared-sections/`,
  `pages/[id]/page-editor.tsx`, `media/media-library.tsx`), applying
  `bg-osi-navy-900`/`-800`, `border-osi-sand-300`, `text-osi-slate-400`,
  `bg-osi-gold-500`, `text-osi-white`, `border-osi-steel-500`,
  `outline-osi-gold-500`, and `font-display`/`tracking-wide-display`/
  `tracking-wide-label` directly, all still wrapped in `.admin-root` via
  `app/admin/layout.tsx`.

  What actually protects the admin from those classes rendering real
  public brand colors is `admin.css`'s own comment: "Compatibility bridge
  while individual editors move to semantic admin primitives. Existing
  Tailwind utilities resolve through these scoped variables, so none of
  these changes leak into the public site." Concretely, `.admin-root`
  (lines 45–54) redefines exactly **10** `--color-osi-*` tokens to the
  admin's native palette — `cream-100`→`--admin-canvas`,
  `cream-200`→`--admin-surface-muted`, `sand-300`→`--admin-border`,
  `navy-900`→`--admin-primary`, `navy-800`→`--admin-primary`,
  `navy-700`→`--admin-primary-hover`, `slate-400`/`slate-300`→
  `--admin-ink-secondary`, `slate-200`→a literal `#c7d2dc`, and
  `gold-700`→`--admin-accent`. Every admin `osi-*` class built on one of
  those 10 tokens renders admin-native colors today, not real OSI brand
  hex — the bridge works as documented for those.

  **But `--color-osi-gold-500`, `--color-osi-gold-400`,
  `--color-osi-steel-500`, and `--color-osi-white` are *not* among the
  10 aliased tokens.** `bg-osi-gold-500`/`text-osi-white`/
  `border-osi-steel-500`/`outline-osi-gold-500` classes used in admin
  markup — the login/forgot-password/reset-password gold submit buttons
  and steel input borders, the page-editor's and shared-section-editor's
  gold "Publish" buttons (`bg-osi-gold-500 ... text-osi-navy-900`) —
  render the real, literal public brand values (`#E2902A`, `#F0A93D`,
  `#234E7B`, `#FFFFFF`) inside `.admin-root` **today**, because nothing
  in `admin.css` redefines those four variables for admin scope. This is
  a pre-existing state, not something this branding module introduces,
  and fixing the admin's own remaining raw-utility screens is squarely
  the admin-ui-motion-redesign plan's territory (its own phases 7–10 are
  "not started" per the branding plan's status section) — not this
  document's job to remediate. It matters here because of what it implies
  for **this** plan's Phase 2/3 runtime-theme work: those four variables
  are declared once, globally, in `app/globals.css`'s `@theme` block —
  not scoped to `.public-site` today. If Phase 2's theme compiler resolves
  a published brand change by overwriting `--color-osi-gold-500`/etc. at
  that same global scope (rather than emitting brand values only inside a
  `.public-site` boundary, per the plan's own "Runtime theme architecture"
  requirement), an administrator publishing a different accent color
  would silently recolor the admin's own gold Publish buttons and steel
  borders too — a direct violation of the plan's non-goal ("Recoloring or
  re-fonting the admin interface from public branding settings"). **Flag
  for Phase 2/3: either (a) confirm the theme compiler's output is
  actually scoped under `.public-site` (or equivalent) rather than
  `:root`, which would make this a non-issue regardless of admin.css's
  aliasing gaps, or (b) if any global-scope `--color-osi-*` overwrite is
  used anywhere, extend admin.css's alias list to cover
  gold-500/gold-400/steel-500/white the same way the other 10 tokens are
  covered, before Phase 2 ships.**

## 7. Summary counts

- Distinct color tokens/usages classified: 12 `@theme` color tokens + 1
  derived raised-surface value + 1 focus color + 1 global-error fallback
  triplet + 2 system status-color triplets + 2 derived border values =
  **~19 distinct color decisions**, all classified structural / semantic
  / content-specific / intentionally fixed above.
- Distinct font tokens/usages classified: 4 `@theme` font tokens (one of
  which — `font-display-soft` — is structural/dead) + 1 admin override
  family = **5 font decisions**.
- Blocks inventoried: **34 of 34** registered block types (all of
  `lib/blocks/registry.ts`), each with a proposed `appearance`
  classification and, where found, a specific hardcoded-color/font call-
  out for Phase 4 to resolve.
- Font catalog proposed: **9 entries** (3 OSI-current + 4 new Google
  Fonts alternatives across industrial/geometric, editorial, humanist,
  and neutral families + 2 system fallbacks), within the plan's "roughly
  6–10" guidance.
- Cross-cutting findings for later phases: 5 blocks with a hardcoded
  background-unaware accent/muted-text color (§3.1 #2), 1 recurring
  "technical plate" surface pattern spanning 4 blocks (§3.1 #1), 2 blocks
  whose `background`/`accent` fields don't behave like a free surface
  swap today (§3.1 #3), 2 tokens excluded from the public 12-swatch
  palette but confirmed to be actively used by the admin's own
  compatibility-bridge aliasing (navy-800, cream-200 — §2.1/§4.1/§6), a
  partial (not total) admin/public **color** isolation gap covering 4
  un-aliased tokens (gold-500, gold-400, steel-500, white — §6) with a
  direct implication for Phase 2/3's theme-compiler scoping, and 1 real
  gap (no existing warning/information tone to preserve — net-new
  territory for Phase 1).

## 8. What's explicitly deferred

- **Visual baseline screenshot/Playwright capture** — deferred to the
  branding module's own Phase 9 QA pass, per this phase's brief; §1 above
  cites the existing written baseline from the two prior redesign review
  docs instead of re-capturing it.
- **Confirming `osi-navy-800` and `osi-cream-200` have zero *public-site*
  call sites** (both are now confirmed to have real *admin-internal*
  usage via `admin.css`'s compatibility-bridge aliasing — see §2.1/§4.1/§6,
  corrected after task review) — flagged for Phase 1 to verify with a
  repo-wide search of `app/(site)/**` and `components/**` specifically
  (not `app/admin/**`, which is now confirmed non-empty for both) before
  deciding whether to seed either as a distinct *public* swatch.
- **Verifying exact OFL license text** for the four newly-proposed
  catalog fonts (Rajdhani, Fraunces, Source Sans 3, Inter) — flagged in
  §5; this document asserts their license status from well-established
  Google Fonts catalog metadata but did not fetch/inspect an `OFL.txt`.
- **Auditing `RecommendationsClient` in full** — referenced in §3's
  `recommendations` row but not read line-by-line for this inventory;
  flagged for whoever starts Phase 3/4's semantic migration to confirm
  it holds only semantic tokens. (`public-form-styles.ts`, referenced in
  the same row's `contact_form`/`form` context, *was* checked directly
  as part of this phase's self-review sweep below — it uses only tokens
  already catalogued in §2.1: `osi-navy-900`, `osi-slate-300`,
  `osi-steel-500`, `osi-gold-500`/`gold-400`. No new token found there.)

### 8.1 Self-review sweep (acceptance check)

**Scope boundary (stated explicitly after task review — this was left
implicit in the first draft, which is exactly how the §6 admin-isolation
error below went undetected by this section):** the sweep described here
covered only `components/ui/*` and `app/(site)/**/*.tsx` — it did **not**
include `app/admin/**`. That gap is what let the original, incorrect
"no admin file references any `--color-osi-*` token" claim in §6 stand
uncorrected until task review caught it with a direct `app/admin/**`
grep (see §6's corrected text and §2.1's `osi-navy-800`/`osi-cream-200`
rows for what that admin-scoped sweep actually found). A separate,
dedicated `app/admin/**/*.tsx` + `app/admin/admin.css` sweep was run as
part of this fix and is reflected in the corrected §2.1/§4.1/§6 text —
that sweep, unlike this one, intentionally *is* about admin files,
specifically to characterize the admin/public isolation boundary itself,
not because admin markup is otherwise in scope for a *public* token
migration matrix.

Beyond the files read in depth for §§2–6, a final grep pass was run
across every remaining `components/ui/*` primitive not yet individually
covered (`public-form-styles.ts`, `label-plate-grid.tsx`,
`record-product-view.tsx`, `social-icon.tsx`, `external-link-icon.tsx`,
`tilt-card.tsx`, `animated-group.tsx`, `animated-section.tsx`,
`reveal-section.tsx`) and every remaining `app/(site)/**/*.tsx` route
file not already read (`loading.tsx`, `resources/page.tsx`,
`products/[category]/[slug]/page.tsx` + its `loading.tsx`, `news/page.tsx`
+ `[slug]/page.tsx`, `industries/[slug]/page.tsx`,
`applications/[slug]/page.tsx`, `search/page.tsx`,
`preview/[...slug]/page.tsx`) for `font-display`/`font-editorial`/
`font-body`/`bg-osi-*`/`text-osi-*`/`border-osi-*`/`from-osi-*`/
`via-osi-*`/`to-osi-*`/literal hex patterns. Every match found resolves
to a token already classified in §2.1/§2.2 (`osi-navy-900`,
`osi-gold-500`/`400`/`700`, `osi-slate-200`/`300`, `osi-sand-300`,
`osi-steel-500`, `font-editorial`) — no additional distinct color or
font token exists in the *public* routes/primitives outside what §§2–6
already document. `components/ui/social-icon.tsx`,
`external-link-icon.tsx`, `tilt-card.tsx`, `animated-group.tsx`,
`animated-section.tsx`, and `reveal-section.tsx` returned zero matches
(pure structural/motion, no color or font decisions of their own).
