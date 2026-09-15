# Public redesign baseline and reconciliation

Date: 2026-09-15  
Starting commit: `3ff3b9d`  
Plan: `docs/superpowers/plans/2026-09-15-public-site-ui-motion-redesign.md`

## Working-state note

The redesign began after the CMS remediation was reported complete and re-reviewed. The repository was intentionally not clean: the approved admin redesign was still present as uncommitted work. Public work is isolated to the public layout, public blocks/primitives, and documentation; no admin behavior was reverted. Database migrations were not required for phases 0–2.

## Existing motion-plan reconciliation

| Earlier item | Status entering this redesign | Decision |
| --- | --- | --- |
| Shared `motion` registry and one easing curve | Shipped | Keep and extend with named public timings. |
| Section reveal and stagger primitives | Shipped | Keep; cap travel at 8px and avoid nested reveals. |
| Hero reveal opt-out for LCP | Shipped | Keep. |
| Press feedback | Shipped | Standardize at `scale(.98)` and 140–220ms. |
| Tilt cards | Shipped | Keep only where pointer position conveys depth. |
| Gradient text sweep | Superseded | Retain a static navy-safe gold gradient; remove the continuous sweep. |
| Infinite logo marquee | Superseded | Render a static, wrapping strip with no duplicate accessibility tree. |
| CTA/video pulse glow | Superseded | Replace with event-driven hover/press feedback. |
| Hover-tracked header underline | Superseded | Use stable active-route indication and ordinary hover feedback. |
| Admin interaction polish from public rollout | Invalidated | Admin now has its own design plan and scoped stylesheet. |

## Public route and state matrix

| Surface | Route/template | Populated source | Required sparse/error coverage | Redesign phase |
| --- | --- | --- | --- | --- |
| Home | `/` | CMS page blocks | Missing hero media, one/no CTA, empty dynamic blocks | 3 |
| Product discovery | `/products` | Products, categories, industries, applications, CMS service pages | Empty tab/filter results, long category names | 4 |
| Product detail | `/products/[category]/[slug]` | Product record plus ordered blocks | Missing diagram/gallery, sparse specs, 404, loading | 5 |
| Industry | `/industries/[slug]` | Taxonomy detail plus blocks | Sparse content, 404 | 3/5 |
| Application | `/applications/[slug]` | Taxonomy detail plus blocks | Sparse content, 404 | 3/5 |
| Services/standard pages | `/[...slug]` | CMS page and blocks | Long rich text, missing images, draft exclusion, 404 | 3/8 |
| Preview | `/preview/[...slug]` | Authorized draft blocks | Invalid token/session, draft banner/context | 8/9 |
| News index/detail | `/news`, `/news/[slug]` | Published news records | Empty index, missing image, 404 | 6 |
| Resources | `/resources` | Published resources | Empty/filter-zero/loading | 6 |
| Search | `/search?q=` | Search index/results | Empty query, zero results, long query, pending | 6 |
| Contact/forms | `/contact` and form blocks | Settings, form definitions | Success, validation, server error, pending | 7 |
| Locations/directory | CMS routes/blocks | Locations and directory contacts | Empty location data, missing map | 7 |
| Global loading | `(site)/loading.tsx` plus product detail loading | Route data | Reduced motion and layout stability | 6/9 |
| Public error | `(site)/error.tsx` | Runtime failure | Retry and home recovery | 6/9 |
| Missing route | `(site-404)` using shared public chrome | Genuine 404 | Search/home recovery | 6/9 |

## Block-renderer inventory

Thirty-three registered block types were present at the baseline:

- Heroes and product framing: `hero_full`, `hero_page`, `product_hero`.
- Editorial/content: `section_heading`, `rich_text`, `columns`, `image`, `embed`, `quote_testimonial`, `accordion`.
- Discovery/cards: `feature_tiles`, `product_grid`, `recommendations`, `benefits_cards`, `mission_cards`, `link_columns`, `resource_list`, `news_feed`, `team_directory`.
- Technical/media: `stat_grid`, `split_feature`, `global_map`, `stages_carousel`, `how_it_works`, `video_embed`, `image_gallery`, `spec_table`, `logo_strip`.
- Conversion/composition: `contact_form`, `form`, `contact_details`, `cta_band`, `button_group`, `shared_section`.

The registry remains the single source of truth in `lib/blocks/registry.ts`; the redesign must not create route-specific copies of these block renderers.

## Visual baseline observations

- Desktop header was crowded by four utility links plus a permanently visible search field. Menu content was all-caps Orbitron, visually dense, and left a large unstructured lower area.
- The public site used Montserrat for body copy and Orbitron for most controls/headings, flattening hierarchy.
- Footer columns had no visible headings and social links used first-letter placeholders.
- Native focus treatment existed and passed contrast, but search was not a focused modal flow.
- The 390px home view exposed a 4px horizontal overflow from the stat-grid hairline overlay.
- Continuous gradient, marquee, glow, and pulse treatments conflicted with the quieter, purposeful motion direction.

## Phase 0–2 implementation outcome

- Added a scoped `.site-shell`, semantic public surface/timing/geometry tokens, explicit typography roles, anchor offsets, and reduced-motion-compatible dialog transitions.
- Consolidated common public fixtures in `/styleguide`: button states, icon button, eyebrow, section header, media fallback, divider, status messages, empty state, and skeleton.
- Rebuilt global navigation around primary links, labeled search and menu triggers, native modal focus management, active-route state, safe-area padding, and CMS-driven mega/utility groups.
- Reworked announcement and footer typography, hierarchy, action priority, contact links, group headings, and social icons.
- Removed active ambient loops from the gradient text, logo strip, CTA breakout, and video play control.
- Corrected the stat-grid negative inset responsible for mobile horizontal overflow.

## Follow-up gates

Phases 3–10 remain intentionally open: hero families/page composition, product discovery/detail, content/search/sparse states, forms/locations, full block coverage, accessibility/responsive audit, performance, and regression handoff.
