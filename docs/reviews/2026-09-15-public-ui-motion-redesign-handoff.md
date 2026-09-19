# Public site UI and motion redesign — implementation handoff

Date: 2026-09-15  
Starting commit: `3ff3b9d`  
Implementation commit: `2071d44`  
Plan: `docs/superpowers/plans/2026-09-15-public-site-ui-motion-redesign.md`

The implementation was incorporated into `2071d44` by a concurrent commit. The final reduced-motion hydration fix, its regression test, and this handoff remain as working-tree changes at the time of writing.

## Outcome

The public OSI site now has a cleaner editorial/industrial hierarchy, a less crowded global shell, purposeful interaction feedback, URL-backed discovery tools, designed sparse/error states, and accessible media interactions. OSI's navy, cream, steel, gold, photography, and engineered geometry remain intact. Admin styling remains separately scoped.

The work did not change CMS schemas or write production data. Existing uncommitted admin-redesign work was preserved. The seed-navigation definition was cleaned for future runs, while runtime navigation filtering protects the current live dataset immediately.

## Main changes

### Public foundation

- Added a scoped `.site-shell` with semantic surfaces, borders, widths, radii, timings, sticky-anchor offsets, and responsive typography guards.
- Established Orbitron for short display moments, Montserrat for editorial headings, and Poppins for body/interface text.
- Reduced shipped font variants to those actually used.
- Added shared eyebrow, section header, icon button, media frame, divider, status, empty-state, skeleton, form-style, social-icon, and query-state primitives.
- Kept public and admin font/color systems isolated.

### Global shell and navigation

- Simplified the sticky header to three primary destinations plus labeled Search and Menu controls.
- Replaced the permanent search field with a focused native-dialog search experience.
- Rebuilt the full menu as a responsive native dialog with active-route state, safe-area padding, grouped navigation, Escape behavior, and restored trigger focus.
- Added footer group headings, shared social icons, contact actions, clearer CTA priority, and stronger sparse-page proportions.
- Public product navigation now checks published product records and suppresses soft-404 destinations. `scripts/seed-navigation.ts` also contains only the three products backed by client content.

### Content and discovery

- Long hero titles now switch to the editorial face and wrap safely; hero imagery receives contrast protection without hiding LCP text.
- Product view, category, search, and sort state are encoded in readable URL parameters and restored by browser history.
- Product cards are semantic links with consistent image ratios, concise visible teasers, and intentional missing-media treatment.
- Search, resources, and news received clearer metadata, result rhythm, localized dates, filters where supported, and useful empty states.
- Resource filtering now has one maintained implementation shared by the route and CMS block.

### Technical media and motion

- Technical product diagrams and image galleries open in a shared fullscreen native-dialog lightbox with visible close controls, keyboard operation, announcements, and focus restoration.
- Fullscreen media is mounted only when opened; thumbnails/technical plates retain explicit responsive image sizes.
- Stage carousels support buttons, arrow keys, drag/swipe, current-stage announcements, and reduced motion; autoplay remains off.
- Removed active ambient gradient, marquee, CTA pulse, and video glow loops. Motion is now tied to hover, press, disclosure, navigation, or composed content entry.

### Forms and public states

- Contact and generic CMS forms share visible labels, field styling, stable pending buttons, and non-native success/error messaging.
- Missing-map presentation is compact and includes a valid directions action.
- Loading, not-found, recoverable error, missing technical media, and empty resource/news/search states have maintained public compositions.
- Rich text, accordions, specs, quotes, columns, cards, CTA bands, galleries, news, resources, team, and other registered blocks received the same typography/spacing/contrast sweep.

## Important QA fixes found during implementation

- Fixed a 4px narrow-mobile overflow caused by the stat-grid overlay.
- Added an accessible name to the icon-only mobile search trigger.
- Fixed footer and contact fallback contrast failures found by axe.
- Fixed `/styleguide` returning 500 because fixtures referenced an unapproved image host.
- Fixed duplicated Search metadata under the root title template.
- Added responsive `sizes` and eager loading to appropriate public imagery after Next.js development warnings exposed missing contracts.
- Removed obsolete `/locations` expected-failure coverage after confirming the live route exists.
- Removed the navigation test's historical product allow-list; all rendered internal destinations are now checked strictly.
- Removed a reduced-motion hydration mismatch found during the final browser shutdown review. Public Motion components now delay the client-only media preference until after the hydration render, then apply the no-travel variants; a regression check covers this path.

## Verification

- `pnpm check`: passed, 71 test files / 577 unit tests.
- `pnpm build`: passed with Next.js 16.3.4.
- Public accessibility suite: 24/24 checks passed across desktop and mobile, including both lightbox variants and reduced-motion hydration.
- Public route smoke suite: 44 passed and 4 data-dependent cases skipped across desktop and mobile.
- Strict header/mega-menu/footer link verification: 2/2 desktop/mobile checks passed with no destination allow-list.
- Custom responsive matrix: `/`, `/products`, a product detail, `/contact`, `/resources`, `/search?q=pump`, and the 404 route at 320, 390, 768, 1024, and 1440 pixels.
- Manual browser checks for menu/search dialogs, Escape, focus restoration, gallery controls, technical-image fullscreen, carousel keyboard state, reduced motion, and mobile overflow.

## Known follow-ups and deviations

- The user guide is intentionally deferred per the user's earlier instruction.
- Industry and application detail e2e cases remain `fixme` until real published records exist; no client content was fabricated.
- The styleguide is a maintained representative fixture, not an exhaustive generated matrix for every state of every data-backed block.
- Lighthouse and real-user Core Web Vitals were not recorded against the local live-data development server. Measure them on the deployed production build.
- Real-device touch, VoiceOver/NVDA, browser 200% zoom, and platform forced-colors checks remain release QA; automated axe, keyboard, reduced-motion, and viewport coverage passed.
- Vitest emits an existing configuration warning about future native config loading; it does not fail tests and is unrelated to the public redesign.

## Files to start with

- `app/globals.css`
- `app/layout.tsx`
- `app/(site)/layout.tsx`
- `components/layout/mega-menu-client.tsx`
- `components/layout/footer.tsx`
- `components/ui/public-primitives.tsx`
- `components/ui/use-query-state.ts`
- `components/blocks/product-grid-client.tsx`
- `components/blocks/resource-browser-client.tsx`
- `components/blocks/image-gallery-client.tsx`
- `lib/data/navigation.ts`
- `lib/motion/variants.ts`
- `lib/motion/use-hydrated-reduced-motion.ts`
- `app/styleguide/page.tsx`
