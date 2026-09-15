# OSI public site UI and motion redesign — implementation plan

> **Do not start this plan until the CMS audit remediation is merged, its schema and public rendering contracts are stable, and the working tree is clean.** This plan is a visual and experience refinement phase. It must not compete with the content-model, media, shared-section, form, permission, or admin work currently in progress.

**Goal:** Evolve the public OSI website into a polished, contemporary industrial experience that is clear to navigate, easy to scan, accessible on every input mode, and visually coherent across populated, sparse, loading, and error states. Preserve the recognizable OSI brand while making motion explain product relationships, spatial changes, and user feedback.

**Reference direction:** Carry forward the strongest principles from `quattro-motion-shape-guide.md`, the Tyche/Quattro Gestión work, and the existing OSI motion foundation: responsive physical feedback, interruptible transitions, confident typography, disciplined depth, strong hierarchy, and thoughtful responsive composition. Do not import Quattro's visual identity. OSI remains navy, cream, steel, gold, technical photography, and engineered geometry.

**Primary feeling:** engineered, cinematic, credible, and effortless.

---

## Relationship to existing plans

This is not a replacement for:

- `2026-09-11-site-wide-motion-redesign-foundation.md`
- `2026-09-11-site-wide-motion-redesign-rollout.md`
- `2026-09-14-cms-audit-remediation.md`
- `2026-09-14-admin-ui-motion-redesign.md`

The first two established reusable motion primitives and delivered an initial rollout. This plan begins with a reconciliation pass: mark what is already complete, retain the useful primitives, and implement only the gaps exposed by the visual inspection. The CMS remediation remains the source of truth for block schemas and rendering behavior. The admin redesign remains visually separate from the public site.

---

## Evidence from the visual inspection

The deployed home, product listing, product detail, contact, resources, news, search, header/mega-menu, footer, and representative empty states were reviewed at desktop width. The source for the public shell and existing motion primitives was also inspected.

### What already works

- The navy, cream, gold, and steel palette is distinctive and appropriate for OSI.
- Technical photography, diagonal cuts, clipped corners, label plates, hairline grids, and diagram imagery provide a strong industrial vocabulary.
- The home hero has a confident brand presence and a clear primary message.
- The product-detail split hero gives technical media suitable prominence.
- Existing `RevealSection`, `AnimatedGroup`, `TiltCard`, shared underline, and reduced-motion variants provide a useful foundation.
- Hero content is not initially hidden, protecting perceived performance and LCP.
- The mega-menu already includes important keyboard behaviors such as focus containment, Escape handling, and focus restoration.
- Global focus and reduced-motion rules exist and should be strengthened rather than recreated.

### What is currently wrong or incomplete

- The desktop header is crowded: `MENU`, utility destinations, and inline search compete in one strip. The relationship between the full navigation and `MENU` is unclear.
- The header search field has weak contrast and consumes permanent space without behaving like a focused search experience.
- Current-route context is too subtle, so users do not always know where they are.
- Orbitron and uppercase treatments are applied to long titles and result headings where they reduce readability. The display face needs a stricter role.
- Several dark-section paragraphs use low-contrast gray and long line lengths, especially in heroes and product descriptions.
- Product cards contain uneven content density. Long summaries overwhelm the grid while image-light entries appear as tall dark placeholders.
- Product tabs and category chips are visually filter-like but their state is local rather than URL-backed, making views hard to share and browser navigation unreliable.
- Card expansion changes a large amount of layout abruptly and uses a generic interactive container pattern instead of a clearly named control.
- Product-detail pages repeat long summaries, use overly long uppercase benefit headings, and need clearer separation among overview, benefits, operation, media, downloads, and related products.
- The contact page gives an unavailable map a very large empty rectangle, allowing a failure state to dominate the page.
- Form fields need consistently visible labels, descriptions, validation, pending, error, and success treatments.
- News and resources empty states are visually barren. A heading and one sentence leave the footer to dominate most of the viewport.
- Search uses a bare underline field, removes the native outline without an equivalent local focus treatment, and renders dense result text with weak hierarchy.
- Footer link groups lack visible section headings and become disproportionately large on sparse pages.
- A visible public navigation link can lead to the branded 404 page. Link integrity is a remediation concern, but the later visual pass must verify that navigation and empty/error states remain coherent.
- Section reveal is applied broadly. Repeating the same fade-rise on every section makes motion predictable without explaining anything.
- Continuous glow/pulse decoration risks drawing attention away from content and calls to action. Repetition should be reduced.
- Responsive, touch, 200% zoom, safe-area, and long-content stress states need a systematic visual pass rather than route-by-route fixes.

---

## Design principles

1. **Preserve the OSI identity.** The public site keeps its industrial palette, technical imagery, engineered lines, and selective display typography.
2. **Clarity before spectacle.** Motion, cropping, contrast, and composition must improve understanding or feedback. Decorative effects never compete with technical content.
3. **Editorial hierarchy.** Use strong but limited display moments, readable body measures, disciplined spacing, and asymmetry with intentional alignment.
4. **Motion explains space.** Menus originate from their triggers, filters preserve spatial context, cards expand from their own geometry, and galleries move in the direction of navigation.
5. **Every state is designed.** Loading, empty, unavailable, error, success, missing media, long copy, and incomplete CMS content must look deliberate.
6. **Content remains authoritative.** Do not invent marketing claims, metrics, downloads, customer logos, testimonials, or technical facts to fill layouts.
7. **Input parity is mandatory.** Hover has a focus or explicit touch equivalent. Drag/swipe interactions also have buttons and keyboard operation.
8. **Performance is part of the aesthetic.** Important content paints immediately; media is correctly sized; animations avoid layout thrash; no visual treatment causes CLS.
9. **Admin and public remain separate.** Do not share the admin typography, neutral canvas, or productivity-shell patterns with the marketing site.

---

## Refined public design system

The redesign is an evolution of the existing public tokens, not a palette reset.

### Typography roles

- **Display:** Orbitron only for short hero titles, product names, major numeric statements, and compact technical labels.
- **Editorial heading:** Montserrat for section headings, article titles, search results, multi-line card headings, and any title longer than approximately 45 characters.
- **Body and interface:** Poppins for paragraphs, navigation, controls, filters, metadata, forms, and captions.
- Avoid long all-caps sentences. Use uppercase for eyebrows, short labels, and navigation only.
- Use `text-wrap: balance` for short display headings and `text-wrap: pretty` for body copy where supported.
- Default body measure: 60–72 characters. Technical summaries may extend to 78 characters only in wide editorial layouts.
- Minimum body size: 1rem; supporting metadata may use 0.8125–0.875rem when contrast remains strong.

### Color and contrast roles

- Navy remains the primary atmospheric surface.
- Cream remains the primary reading canvas.
- White is reserved for technical plates, diagrams, cards, and high-contrast text on navy.
- Gold is an intentional accent for the principal CTA, active markers, and selected technical details—not a general-purpose highlight.
- Steel blue supports secondary actions, diagrams, separators, and subdued interactive states.
- Introduce semantic success, warning, danger, and information roles that work on both navy and cream.
- All text and essential icons must meet WCAG AA contrast. Avoid low-opacity gray paragraphs on navy.
- Do not introduce purple gradients, generic neon glows, glass cards everywhere, or AI-style color washes.

### Geometry, spacing, and depth

- Retain clipped corners and diagonal cuts only where they communicate an OSI brand moment: heroes, media masks, featured cards, and CTA bands.
- Ordinary text cards, search results, forms, accordions, and resource rows use calmer geometry.
- Use an 8px spacing grid with 4px refinement for compact controls.
- Maintain consistent responsive gutters: 16px mobile, 24px tablet, 32–48px desktop.
- Establish three intentional content widths: reading, standard, and wide/media.
- Depth comes from overlapping planes, restrained shadow, image contrast, and hairlines—not repeated glow effects.
- Every media container defines a stable aspect ratio or dimensions before loading.

### Reusable visual motifs

Retain and standardize these motifs instead of inventing new decoration per page:

1. Technical hairline grid for sparse atmospheric backgrounds.
2. Duotone industrial photography with legible overlay protection.
3. White technical plate for diagrams and product drawings.
4. Gold breakout action for a single high-priority CTA.
5. Label-plate product card with a predictable open/closed model.
6. Clipped editorial media frame for featured content.

---

## Public motion language

The existing motion utilities should be consolidated into a public motion registry rather than duplicated inside page components.

### Motion tokens

- Press feedback: 90–120ms; scale no lower than 0.98 on substantial controls.
- Hover/focus color and underline: 140–180ms ease-out.
- Small disclosure/popover: 160–220ms, opacity plus 4–8px movement from its trigger.
- Section transition: 260–400ms, opacity plus no more than 12px movement.
- Large menu/sheet: interruptible, critically damped spring with no bounce.
- Card expansion/shared layout: critically damped spring; preserve the selected card's origin.
- Gallery/carousel: momentum-aware spring with directional continuity and no hard snap after input is released.
- Background image settle, when used: a single subtle transform after paint, never an initial invisible hero and never a continuous loop.

### Motion rules

- Use `transform` and `opacity` for high-frequency animation.
- Do not use `transition: all`.
- Do not animate layout properties on scroll when a transform can express the same relationship.
- Motion is interruptible. Reversing a menu, card, or carousel uses its current visual state as the new origin.
- A repeated section type uses a consistent transition throughout the site.
- Do not stagger long result sets, product grids after every filter, or large lists.
- Do not hide essential content solely to wait for an intersection observer.
- Continuous pulse, floating, rotating, or glow effects are limited to genuinely live/status behavior; ordinary CTAs use responsive hover, focus, and press feedback.
- Any animation that runs longer than five seconds must be pausable. Prefer no indefinite ambient motion.
- `prefers-reduced-motion: reduce` removes parallax, tilt, large translations, and momentum; state changes remain immediate and understandable.
- Reduced transparency/high contrast environments retain boundaries and legibility without relying on blurred material.

### Motion by purpose

| Purpose | Pattern | Avoid |
| --- | --- | --- |
| Orientation | active-nav underline, menu origin, breadcrumb continuity | unrelated page-wide wipes |
| Disclosure | anchored height/opacity or shared-layout expansion | content teleporting or bouncing |
| Feedback | press, progress, success/error state | decorative looping |
| Story | selective reveal of one composed group | animating every paragraph independently |
| Exploration | directional gallery/carousel movement | autoplay without control |
| Technical explanation | staged lines/hotspots only when supported by content | fabricated data animation |

---

## Target public information architecture and shell

### Desktop header

- Keep the logo and core navigation immediately visible.
- Separate primary destinations from utility destinations. Utility links can move into a secondary region of the mega-menu instead of competing in the header strip.
- Treat `MENU` as the explicit gateway to the full information architecture, not a label beside an equally prominent full navigation.
- Replace the permanent inline search field with a clearly labeled search trigger that opens an anchored search panel or focused overlay.
- Add a visible current-route state, not hover-only styling.
- On scroll, the header may reduce height and gain a restrained solid/translucent material, but content must not jump and contrast must remain stable.

### Mobile header and menu

- Use one clear menu trigger, logo, and search trigger.
- Open a full-height sheet with safe-area padding, body scroll lock, focus containment, Escape behavior, and restored trigger focus.
- Primary links appear first; utility links, contact, language, and secondary actions have explicit grouped labels.
- Expansion indicators announce their state and use real buttons.
- The active page and expanded branch remain obvious.

### Footer

- Add visible group headings to every link column.
- Separate navigation, services, resources, company, and contact according to actual destinations in the CMS; do not preserve empty groups.
- Keep the closing OSI statement and primary CTA, but make the footer compact enough that it does not overwhelm sparse pages.
- Use a responsive accordion only where mobile height benefits and preserve semantic headings/links.
- Verify all footer links, social labels, contact actions, and external-link behavior.

### Global access

- Add a visible-on-focus skip link and a stable `main` target.
- Keep breadcrumbs on deep taxonomy, product, news, and resource pages.
- Ensure the browser back button restores search/filter state and logical scroll context.

---

## Implementation phases

### Phase 0 — Freeze, reconcile, and capture a visual baseline

**Gate:** Wait for the CMS remediation to finish. Record the final commit SHA, confirm migrations, run the repository's required checks, and capture a clean baseline before creating a redesign branch.

**Actions:**

- Compare the two 2026-09-11 motion plans against current code and mark each item as shipped, superseded, incomplete, or invalidated by the remediation.
- Inventory every public route and every block renderer after remediation, including draft/preview behavior.
- Build a route/state matrix for home, products, taxonomy, product detail, services, industries, applications, news, resources, standard pages, search, contact, locations, 404, and server error.
- Capture populated, sparse, empty, loading, error, missing-image, and very-long-content fixtures.
- Capture desktop 1440×900, laptop 1024×768, tablet 768×1024, mobile 390×844, and narrow mobile 320px screenshots.
- Record keyboard order, focus visibility, touch behavior, reduced motion, 200% zoom, and high-contrast observations.

**Acceptance:** The matrix and screenshots exist before visual implementation. This phase makes no public UI changes.

### Phase 1 — Refine public tokens and consolidate primitives

**Create/refactor:**

- Refine public design tokens in the existing site stylesheet without affecting `.admin-root`.
- Consolidate public variants and transitions in the existing motion registry.
- Establish shared public primitives for button, icon button, link arrow, eyebrow, section header, media frame, divider, status message, empty state, skeleton, and focus treatment.
- Add a development-only visual fixture or Storybook-equivalent page for public primitives and block states.

**Requirements:**

- Enforce the typography roles above; no blanket Orbitron replacement.
- Define cream/navy variants once instead of duplicating class strings across renderers.
- Every interactive primitive includes hover, focus-visible, active, disabled, pending, and reduced-motion states.
- Preserve semantic elements; do not build clickable `div` replacements for buttons or links.
- Use one icon source and accessible names for icon-only controls.

**Acceptance:** Primitive fixtures pass AA contrast and demonstrate long labels, translated text expansion, missing icons/images, keyboard focus, and reduced motion.

### Phase 2 — Header, mega-menu, announcement, and footer

**Refactor:**

- Public header and mega-menu components.
- Announcement bar behavior.
- Search entry point and search panel.
- Footer navigation and contact presentation.
- Public layout skip link and main target.

**Requirements:**

- Reduce header density and establish explicit primary versus utility navigation.
- Search opens from a labeled trigger, receives focus, supports Escape, traps focus only if modal, and restores focus on close.
- Mega-menu groups are labeled and scannable, with one optional featured item sourced from CMS data.
- Sticky header behavior does not obscure anchor targets or create cumulative layout shift.
- Menu and search panels originate spatially from their controls and remain interruptible.
- Mobile sheets honor notch/home-indicator safe areas.
- Footer groups have headings and collapse only with accessible disclosure buttons.

**Acceptance:** Full header/footer operation works with keyboard, pointer, touch, 200% zoom, 320px width, no motion preference, and reduced motion.

### Phase 3 — Hero system and page composition

**Create/refactor:**

- Define a small hero family: cinematic home, split technical, editorial interior, and compact utility.
- Standardize section container, reading measure, split layout, media/text alternation, stats band, CTA band, and rich-text flow.
- Recompose the home page from the standardized sections after the block inventory is stable.

**Requirements:**

- Hero text renders immediately and remains the LCP-safe priority.
- Photography overlays guarantee text contrast across arbitrary CMS images.
- Long headings switch to the editorial face and scale without overflowing.
- Section spacing follows content density, not one fixed oversized padding value.
- Avoid repeated nearby CTAs with the same destination and label.
- Use animation on composed groups only where it clarifies narrative progression.

**Acceptance:** Heroes tolerate missing media, portrait media, long headings, two CTAs, one CTA, and no CTA without broken balance or layout shift.

### Phase 4 — Product discovery, taxonomy, and filter behavior

**Refactor:**

- Product listing and shared taxonomy navigation.
- Product card/label-plate behavior.
- Filter tabs, category chips, sort controls if supported, results summary, pagination/load-more behavior, and empty results.
- Industries, applications, and services listing archetypes where they share discovery behavior.

**Requirements:**

- Store active taxonomy, filters, sorting, and page in the URL with readable query parameters.
- Back/forward navigation restores state without a full visual reset.
- Use semantic tabs only where panels truly follow the tab pattern; use links or toggle buttons for navigation/filtering otherwise.
- Filter chips wrap or scroll intentionally on narrow screens and never hide the active selection.
- Product summaries use a defined teaser length or visual clamp; full descriptions belong on detail pages.
- Missing product imagery uses an intentional technical placeholder with useful label/alt behavior, not an unexplained dark gradient slab.
- Make card disclosure a named button with `aria-expanded` and `aria-controls`, or remove expansion in favor of a consistently scannable teaser card.
- If expansion remains, animate from the card's existing geometry and preserve nearby scroll position.
- Filtering updates results promptly, announces result counts, and avoids staggering every returned card.

**Acceptance:** A user can deep-link to a filtered view, operate it by keyboard/touch, reload it, and use browser history without losing state.

### Phase 5 — Product and technical-detail pages

**Refactor:**

- Product hero, breadcrumb, overview, benefits, operation/process, media gallery, specifications, related resources, downloads/3D, related products, and closing CTA.

**Requirements:**

- Balance the hero's text and technical plate so neither becomes an isolated oversized column.
- Use a readable body measure and stronger contrast on navy.
- Remove repeated summaries or assign each occurrence a distinct purpose.
- Long benefit titles use sentence case and the editorial heading face.
- Provide a sticky or compact in-page section navigator only when enough sections exist to justify it.
- Technical images support zoom/fullscreen with an accessible dialog, visible close control, and correct focus restoration.
- Downloads expose file type and size when available. Pending/unavailable assets receive honest, designed states.
- Animate technical hotspots, flow paths, or stage changes only when the CMS contains the required explanatory data. Static diagrams remain static.
- Related content cards use shared card primitives and avoid duplicating the primary page introduction.

**Acceptance:** Product detail remains coherent with short, long, partial, and media-rich content and works without JavaScript-enhanced motion.

### Phase 6 — Search, resources, news, and sparse states

**Create/refactor:**

- Search field, result row/card, filters, result count, no-results guidance, and pagination.
- Resource and news listing cards, metadata, category filters where supported, and intentional empty states.
- Shared not-found, unavailable, and recoverable-error compositions.

**Requirements:**

- Search input has a persistent label or accessible name, visible focus ring, submit control, clear control, and useful autocomplete attributes.
- Query lives in the URL and is preserved across pagination/filtering.
- Result titles use the editorial face when long; snippets are concise and visually subordinate.
- Highlight matched text only when it can be done accessibly and without misleading context.
- Empty states explain what is absent and offer one valid next action such as clearing filters, exploring products, or contacting OSI.
- Do not invent news, resources, or filler cards to make the layout look populated.
- Sparse pages reserve enough useful content structure that the footer does not dominate the first viewport.
- Dates, counts, and file sizes use locale-aware formatting.

**Acceptance:** Search and content listings are usable with zero, one, many, and very long results at all target widths.

### Phase 7 — Contact, locations, and public forms

**Refactor:**

- Contact detail layout and map/fallback region.
- Shared public form primitives and form renderer output.
- Pending, inline validation, form-level error, success, and retry states.
- Location cards and directions/contact actions.

**Requirements:**

- Every field has a visible label; placeholder text never substitutes for a label.
- Add correct input types, names, autocomplete tokens, descriptions, and input modes.
- Validation errors are adjacent to fields, associated programmatically, and summarized when submission fails.
- Pending controls retain width, prevent accidental duplicate submission, and announce progress.
- Success replaces or clearly updates the form without relying on a native alert.
- Replace the oversized blank map failure with a compact designed fallback containing the address and a valid external directions action.
- Embedded maps are lazy and require explicit user activation when that improves privacy/performance.
- Public forms work with keyboard, screen reader, zoom, autofill, and password-manager overlays.

**Acceptance:** Each form has automated validation coverage and manual keyboard/screen-reader verification for failure and success paths.

### Phase 8 — Complete block-renderer visual coverage

**Audit/refactor after remediation:**

- Rich text, image, image gallery, video, external embed/HTML, link/button group, quote, columns, accordion/FAQ, stats, logo strip, form, shared section, product stage/carousel, and any final CMS block types.

**Requirements:**

- Map every CMS block type to one maintained renderer and one documented visual contract.
- Merge renderers that differ only by incidental class strings; keep genuinely different semantic/layout variants explicit.
- Each block defines default, dark/light context, long content, missing optional fields, loading, error, and mobile behavior.
- Images require meaningful alt text or explicit decorative intent. Galleries include keyboard controls and announcements.
- Videos use an image poster and explicit play action; do not eagerly load heavy third-party players.
- External embeds have a title, stable aspect ratio, loading state, failure fallback, consent/privacy behavior where necessary, and a link to open the source.
- Embedded HTML remains constrained by the CMS security model and cannot break the site's layout.
- Accordions use buttons, proper expanded state, logical heading levels, and measured/interruptible disclosure motion.
- Carousels expose previous/next buttons, pagination/state, keyboard controls, touch/swipe, and reduced-motion behavior; autoplay is off by default.

**Acceptance:** A block fixture page demonstrates every supported type and state. There are no orphan block schemas and no visually duplicated renderer families without a documented reason.

### Phase 9 — Responsive behavior, accessibility, and interaction QA

**Audit:**

- 320px, 390px, 768px, 1024px, 1440px, and ultrawide layouts.
- Landscape mobile, safe areas, virtual keyboard, 200% text zoom, long unbroken content, browser font enlargement, forced colors, reduced motion, and reduced transparency.
- Keyboard order, focus management, screen-reader names/states, pointer precision, coarse pointer/touch targets, and no-hover devices.

**Requirements:**

- All targets are at least 44×44px when practical and never depend on precise hover.
- Focus remains visible on cream, navy, image, and gold backgrounds.
- Sticky elements never trap content or cover focused controls.
- Anchor destinations account for sticky-header offset.
- No horizontal page scrolling at 320px or 200% zoom.
- DOM order matches the intended reading order even when layouts alternate visually.
- Icon-only controls have accessible names; decorative icons are hidden from assistive technology.
- Status is never conveyed by color alone.

**Acceptance:** Automated accessibility checks pass, followed by manual keyboard and screen-reader smoke tests on all archetypes.

### Phase 10 — Performance, visual regression, and handoff

**Actions:**

- Measure Core Web Vitals before and after at representative public routes.
- Audit image `sizes`, responsive sources, explicit dimensions, priority, lazy loading, and compression.
- Keep motion/client bundles out of server-renderable blocks; dynamically load heavy video, 3D, maps, and galleries only when needed.
- Verify fonts do not cause avoidable layout shift and unused weights are not shipped.
- Add stable visual regression fixtures for global shell, hero families, listing/detail archetypes, forms, block renderers, and empty/error states.
- Run repository checks, production build, Lighthouse, axe, keyboard smoke tests, and real-device touch checks.
- Update the CMS user guide with public-preview expectations, media recommendations, text-length guidance, block appearance, accessibility responsibilities, and screenshots from the final implementation.
- Create a concise implementation handoff for Claude identifying completed phases, deviations, screenshots, commands run, and known follow-ups.

**Targets:**

- No regression in LCP, CLS, or interaction responsiveness from the current measured baseline.
- Lighthouse accessibility score 100 on representative templates; performance target 90+ on realistic production data and network settings.
- No critical or serious axe findings.
- No console errors, broken internal links, native browser alert/prompt/confirm UI, or unhandled missing-content layouts.
- Reduced-motion mode contains no vestibular transforms or continuous animation.

---

## Page-specific direction

### Home

- Keep the cinematic industrial hero, but improve paragraph contrast and constrain the copy measure.
- Clarify the CTA hierarchy: one principal gold action and one quiet secondary action.
- Build a deliberate narrative from capabilities to products, proof, global presence, and contact; remove repeated statements and duplicated CTA destinations.
- Use selective motion at major narrative transitions, not on every individual card.

### Product listing

- Make taxonomy state obvious and shareable.
- Normalize card image ratios and teaser density.
- Preserve visual identity without requiring a card to open before the user understands it.
- Provide an intentional missing-image and no-results treatment.

### Product detail

- Let the technical image behave as an informative plate, not generic decoration.
- Improve summary readability, eliminate duplication, and give downloads/specifications a trustworthy information hierarchy.
- Keep the closing gold CTA, but prevent it from visually colliding with the hero/media boundary.

### Contact

- Balance contact details, location context, and the form.
- Treat map failure as a compact fallback, not the main visual element.
- Use visible labels and calm, high-feedback form states.

### Resources and news

- Create useful card and metadata systems ready for real content.
- Empty pages remain honest but provide context and a valid next step.

### Search

- Present search as a focused utility, with strong input focus, result count, clean result rhythm, and URL-backed state.
- Avoid Orbitron for long result titles and long uppercase wrapping.

### 404 and error pages

- Retain branded tone, make recovery actions explicit, and show only verified navigation destinations.
- Keep error pages lightweight and independent of optional CMS data.

---

## Duplication-control rules

- Maintain one public button/link-arrow family with explicit variants rather than page-local copies.
- Maintain one public field/form family used by contact and CMS-rendered forms.
- Maintain one search/filter query-state utility for product, resource, news, and search views.
- Maintain one empty/error/status family with contextual copy supplied by each route.
- Maintain one media-frame family for image, diagram, video poster, and embed boundary behavior.
- Maintain one motion registry; page components select named patterns rather than declaring arbitrary transitions.
- Share visual primitives, not entire page semantics. A product card and news card may share media/metadata primitives while remaining distinct components.
- Do not consolidate components solely because their current screenshots look similar; preserve distinct accessibility or content behavior.

---

## Verification matrix

| Area | Automated | Manual |
| --- | --- | --- |
| Header/menu/search | interaction, Escape, focus restoration, route state | keyboard, touch, safe area, 200% zoom |
| Filters/tabs | URL state, history, labels, result count | mobile overflow, screen reader, deep link |
| Cards/disclosure | semantic control, expanded state, reduced motion | scroll stability, touch intent, long copy |
| Forms | labels, validation associations, pending/success | autofill, virtual keyboard, screen reader |
| Media/embed | aspect ratio, lazy loading, fallback | keyboard, captions, privacy, failure |
| Motion | reduced-motion assertions, no hidden LCP content | interruption, reversal, perceived continuity |
| Layout | screenshot fixtures at target widths | real device, zoom, long content, forced colors |
| Performance | build, bundle analysis, Lighthouse/Web Vitals | low-end mobile and throttled network |

---

## Definition of done

- The remediation work is merged first, and this redesign lands in an isolated branch/phase.
- Every public route and CMS block appears in the route/state matrix.
- The public typography, color, geometry, and motion systems are documented and implemented without leaking into the admin.
- Header, mega-menu, search, and footer are responsive, route-aware, accessible, and visually uncluttered.
- Product discovery is URL-backed, shareable, keyboard/touch operable, and usable with missing or long content.
- Product detail pages no longer repeat content unnecessarily and handle technical media/resources honestly.
- Search, news, resources, forms, maps, 404, loading, empty, and error states all have deliberate designs.
- No public workflow uses native browser alerts, prompts, or confirms.
- Every interactive animation has a reduced-motion equivalent and can be interrupted where relevant.
- No decorative motion delays access to content or degrades Core Web Vitals.
- Automated checks, production build, accessibility audit, visual regression, and real-device smoke tests pass.
- The user guide and Claude handoff reflect the final public experience.

---

## Non-goals

- Rebranding OSI or replacing its navy/cream/gold identity.
- Copying Quattro's palette, shapes, or application-shell aesthetic.
- Reworking CMS schemas while visual implementation is underway.
- Inventing missing editorial or technical content.
- Adding decorative WebGL/3D, autoplay video, scroll-jacking, or page-transition spectacle.
- Replacing accessible native semantics with animation-oriented wrappers.
- Building a second public component system alongside the existing one.

---

## Recommended delivery sequence

Deliver as small, reviewable pull requests after the Phase 0 gate:

1. Baseline, reconciliation, and public tokens.
2. Shared primitives and motion registry.
3. Header, mega-menu, search entry, footer, and global access.
4. Hero/page composition system and home page.
5. Product discovery and taxonomy state.
6. Product/technical detail experience.
7. Search, resources, news, and sparse/error states.
8. Contact, locations, and forms.
9. Remaining block renderer coverage and deduplication.
10. Responsive/accessibility/performance hardening, regression suite, user guide, and handoff.

Each pull request should include before/after screenshots at desktop and mobile, reduced-motion notes, automated test results, and any content assumptions. Do not combine structural CMS migrations with public visual work.
