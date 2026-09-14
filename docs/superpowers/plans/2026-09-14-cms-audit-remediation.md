# CMS audit remediation — Implementation Plan

> Execute this plan task-by-task. Do not combine phases that have separate data-migration or acceptance gates. Mark checkboxes only after the stated verification passes.

**Goal:** Turn the current OSI admin into a dependable single-site CMS: content has a real draft/published boundary, roles are enforced, every editable field has a public effect, core CMS blocks are present, destructive operations are safe, and the admin is accessible and straightforward to operate.

**Architecture:** Preserve the existing registry-driven page builder, `lib/data` repository boundary, server actions, Supabase/Postgres RLS, and the OSI design system. Add a versioned content boundary and transactional database functions before expanding features. Centralize route construction, validation, permissions, audit logging, admin UI primitives, and media browsing instead of solving those concerns independently in each editor.

**Tech stack:** Next.js 16.3.4 App Router, React 19, TypeScript strict, Tailwind v4, Supabase/Postgres, React Hook Form, Zod, Tiptap, dnd-kit. Add test dependencies only in Task 1.

## Outcomes and non-negotiable constraints

- “Save draft” must never change public content. “Publish” is the only action that promotes draft content.
- An editor can create and edit drafts but cannot publish, unpublish, manage users, change global settings/navigation, or bypass protected-content rules.
- Every field exposed in the admin must either affect the public site or be removed from the admin/schema.
- Every generated internal link must use a shared route helper and have a resolvable public destination.
- Multi-table saves and publish operations must be atomic.
- Raw HTML is never injected directly. Generic embeds use an allowlist and sandboxed iframe strategy.
- Database access remains in `lib/data/*`; components never import `lib/db/client`.
- Existing legacy media URLs remain supported through `resolveMediaUrl()`.
- No fabricated client content. New routes/blocks may render empty states until real content exists.
- Before implementation, read the relevant Next.js 16 guides in `node_modules/next/dist/docs/` for routing, Server Actions, proxy/auth, metadata, and testing.
- At the end of every task: `pnpm lint`, `pnpm exec tsc --noEmit`, relevant tests, and `pnpm build` must pass.

## Target content flow

```text
Admin editor -> draft version -> validate -> preview draft
                                      |
                                      v (admin-only Publish, atomic)
                               published version -> public renderer
```

For versioned content, public queries never read mutable draft rows. Simple structural data such as product categories may remain single-version, but server actions and RLS still enforce capabilities.

---

## Phase 0 — Safety net and contracts

### Task 1: Add automated test infrastructure and baseline regression tests

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`
- Create: `vitest.config.ts`
- Create: `tests/unit/*`
- Create: `tests/e2e/*`
- Create or modify: CI workflow if this repository has one

- [ ] Add Vitest for schemas/helpers/components that do not require a browser.
- [ ] Add Playwright for authenticated CMS workflows and public-route smoke tests. Use seeded, non-production test accounts/data.
- [ ] Add scripts: `test`, `test:unit`, `test:e2e`, and `check`.
- [ ] Capture the current broken-link behavior as failing tests before fixing it:
  - product grid and recommendations must generate `/products/{category}/{slug}`;
  - news/resource/taxonomy links must resolve or not render as links;
  - seeded internal navigation must not land on the 404 page.
- [ ] Capture the role defect as a failing integration test: an editor cannot invoke publish/unpublish or user-management mutations.
- [ ] Capture the draft defect as a failing integration test: editing a published page draft must not alter the public response until Publish.
- [ ] Add a test asserting a system page cannot be deleted through the server action.
- [ ] Add a route smoke-test matrix for `/`, `/products`, product details, `/contact`, generic CMS pages, news, resources, locations, directory, search, and 404 behavior.

**Acceptance:** The new suite runs locally; tests representing current defects fail for the intended reason, while baseline build/lint/type checks remain clean.

### Task 2: Centralize route and link validation

**Files:**
- Create: `lib/routes.ts`
- Create: `lib/validation/url.ts`
- Modify: every public/admin producer of `href`, including product grid, recommendations, news feed, navigation, CTA/link fields, rich text, redirects, and sitemap/search helpers

- [ ] Define typed helpers for product, news, resource, industry, application, page, preview, and admin URLs.
- [ ] Change recommendable-product data to include `categorySlug`; do not reconstruct product URLs from a product slug alone.
- [ ] Define URL validation rules:
  - internal paths start with `/` and cannot use dangerous protocols;
  - external URLs allow only `https:` and approved special schemes such as `mailto:`/`tel:` where the field supports them;
  - redirect sources are internal paths;
  - iframe/embed URLs use a separate provider allowlist.
- [ ] Introduce an internal-link option shape that can represent a page, product, resource, anchor, or explicit URL without each block hand-building paths.
- [ ] Add unit tests for every helper and unsafe protocol case.

**Acceptance:** No block or public component contains an ad hoc product/news/resource path template. Unsafe URLs are rejected server-side.

---

## Phase 1 — Real drafts, publishing, permissions, and atomic saves

### Task 3: Add a true version model for pages

**Files:**
- Create: a numbered SQL migration for page versions and atomic functions
- Modify: `lib/db/database.types.ts` through normal type regeneration
- Modify: `lib/data/pages.ts`, `lib/actions/pages.ts`
- Modify: public/preview page loaders and the page editor

- [ ] Replace the current “published row with mutable blocks” behavior with explicit draft and published versions. Recommended shape:
  - stable `pages` identity/slug record;
  - `page_versions` containing version metadata and state;
  - version-owned block rows, or a validated JSON snapshot if that produces a materially simpler portable schema;
  - one current draft and at most one current published version per page.
- [ ] Migrate every existing page and its blocks without losing IDs, status, SEO data, or ordering.
- [ ] Make public `getPageBySlug()` read only the published version.
- [ ] Make preview read only the current draft version.
- [ ] Make Save Draft update only the draft version.
- [ ] Make Publish atomically validate, archive the previous published snapshot, promote the draft, record actor/time, and create the next editable draft.
- [ ] Preserve revision restore, but restore into the draft rather than public content.
- [ ] Replace delete-then-insert application sequences with one RLS-aware Postgres transaction/function.
- [ ] Add optimistic concurrency using a version number or `updated_at` precondition; return a conflict message instead of silently overwriting another editor.

**Acceptance:** A published page can be edited, saved, previewed, and abandoned without any public change. Publish changes it once, atomically. Two editors cannot silently overwrite each other.

### Task 4: Define and enforce a capability-based role model

**Files:**
- Modify: `lib/auth/index.ts`
- Create: `lib/auth/permissions.ts`
- Create: a numbered RLS migration
- Modify: every mutation server action and admin navigation
- Modify: `docs/CLIENT-HANDBOOK.md` only after behavior is verified

- [ ] Define named capabilities rather than treating `requireAdmin()` as write permission: edit drafts, publish, delete content, manage taxonomy, manage media, manage navigation/settings, view submissions, manage users, view audit log.
- [ ] Adopt this minimum policy:
  - editor: view admin, create/edit drafts, preview, upload media, view submissions;
  - admin: all editor capabilities plus publish/unpublish, destructive deletion, navigation/settings, user management, audit log.
- [ ] Decide explicitly whether editors may archive submissions and delete unused uploaded media; encode the decision once in the capability map.
- [ ] Add `requireCapability()` and use it in every server action.
- [ ] Update RLS so direct database requests cannot bypass the same rules. Do not rely on hidden UI controls.
- [ ] Filter sidebar items and buttons by capabilities; do not show inaccessible Users/settings/publish controls.
- [ ] Protect the last active admin and prevent self-disable/self-demotion when it would leave no administrator.
- [ ] Enforce system-page deletion protection in the server/data layer.

**Acceptance:** Tests prove an editor cannot publish by calling the action directly, cannot mutate protected global areas, and cannot delete a system page. The handbook matches actual behavior.

### Task 5: Make all compound writes transactional and audited

**Files:**
- Create: numbered SQL migration(s) for atomic functions and audit helpers
- Modify: `lib/data/pages.ts`, `products.ts`, `admin-entities.ts`, `navigation.ts`, `media.ts`, `admin-users.ts`, `settings.ts`
- Modify: corresponding server actions
- Add: admin-only audit-log list/detail UI

- [ ] Implement atomic save functions for page versions, products plus child/junction rows, and reorder swaps.
- [ ] Make product duplication and any future shared-block duplication atomic.
- [ ] Record create/update/publish/unpublish/delete/restore/reorder/user-role/settings/navigation/media actions in `audit_log` with actor, entity, entity ID, and a safe diff.
- [ ] Never store passwords, tokens, raw form-submission payloads, or other secrets in diffs.
- [ ] Surface errors without leaving partially deleted children or blocks.
- [ ] Add an admin-only audit-log screen with filters by actor, entity, action, and date.

**Acceptance:** Injected failures during child/block insertion roll back all changes. Every successful CMS mutation has one corresponding audit entry.

---

## Phase 2 — Validation and admin-to-public consistency

### Task 6: Add server-side schemas for every mutation

**Files:**
- Create: `lib/validation/{pages,products,entities,navigation,settings,media,forms}.ts`
- Modify: server actions and `FieldSpec` metadata
- Modify: `components/blocks/rich-text.tsx`

- [ ] Replace loose `any`/database-error validation with Zod schemas at every action boundary.
- [ ] Require meaningful non-empty names, titles, slugs, labels, and mandatory array items.
- [ ] Normalize optional empty strings to `null` in one shared utility.
- [ ] Validate slug format and uniqueness with actionable messages.
- [ ] Replace `rich_text` block's `z.any()` with a recursive schema matching the exact Tiptap nodes/marks the reader supports.
- [ ] Validate block link/embed fields through the shared URL schemas.
- [ ] Validate product category presence before publication because canonical product URLs require it.
- [ ] Validate news dates and event-specific requirements before publication.
- [ ] Return structured field paths and block indices, not only one message string.

**Acceptance:** Blank or malformed content cannot be published; the editor highlights and focuses the exact invalid field/block.

### Task 7: Make every existing admin field functional or remove it

**Files:**
- Modify: product editor/renderer, page settings, navigation, settings, block common schema, related data repositories
- Create migration(s) only where field removal/renaming requires them

- [ ] Product fields:
  - render `body` with the shared rich-text reader;
  - render `hero_image_url` as intended or remove it if the diagram is the only design-approved hero asset;
  - render `video_url` through the safe video block;
  - make `model_3d_url` control the 3D CTA and hide the CTA when absent;
  - connect `brochure_pdf_url` to an actual download action;
  - add related-product editing and rendering using `product_related`;
  - render product-linked resources.
- [ ] Page template:
  - treat template selection as a creation preset that supplies recommended starter blocks and guidance;
  - rename the UI accordingly;
  - remove runtime template choices that have no behavior, including the misleading product template.
- [ ] Background `image`:
  - add a common `backgroundImageUrl`, overlay, focal point, and accessible decorative semantics; or remove `image` from the common option if design review rejects generic backgrounds.
- [ ] Navigation:
  - honor `is_external` with correct anchor behavior, `rel`, and an external-link indication;
  - remove the unused `primary` menu from the schema/admin, or wire it into the public header if the design calls for it. Recommended: remove it because utility + mega are the established header model.
- [ ] Implement the site-wide announcement bar and its settings editor, including enable state, message, optional link, and dismissal behavior; otherwise remove `announcement_bar`.
- [ ] Remove the unused `services` table/search vector after a migration preflight proves it contains no data. Services remain versioned CMS pages.
- [ ] Move the direct database query in `components/blocks/product-grid.tsx` into `lib/data/products.ts`.

**Acceptance:** A field-by-field trace from admin input to database to public output has no dead fields or competing sources of truth.

---

## Phase 3 — Complete public destinations and structured content

### Task 8: Add category management and complete public routes

**Files:**
- Modify: `lib/admin/entity-config.ts`, admin navigation, taxonomy repositories/actions
- Create: public routes for news, resources, industries, and applications
- Create or seed: required system pages for locations/directory where appropriate

- [ ] Add Product Categories CRUD with protected deletion when products reference a category, ordering, slug validation, and change-impact warnings.
- [ ] Fix all product grid/recommendation URLs through `productHref()`.
- [ ] Add `/news` and `/news/[slug]` with metadata, structured data where applicable, body rendering, empty state, and sitemap/search inclusion.
- [ ] Add `/resources` with filtering by type/category/product and accessible downloads.
- [ ] Add `/industries/[slug]` and `/applications/[slug]` pages that describe the taxonomy and list related published products. If product relations are empty, show a deliberate empty state rather than a dead card.
- [ ] Ensure `/locations` and `/directory` have protected system pages using `global_map`/`team_directory`, or dedicated routes if their filtering needs exceed block configuration.
- [ ] Resolve or remove seeded links for `/esp-packages`, `/what-we-do`, placeholder `#` downloads, and other unpublished destinations.
- [ ] Add news/resources/taxonomy destinations to sitemap and search.
- [ ] Ensure not-found responses are not soft-404s; verify status, robots metadata, and streamed behavior in the production server.

**Acceptance:** The internal-link crawler passes against seeded and admin-created content. Every visible card/navigation link has a valid destination.

### Task 9: Add the minimum general-purpose CMS blocks

**Files:**
- Add one server-safe definition/render file per block and client split only where needed
- Modify: block registry, admin field metadata, block palette descriptions
- Add: schemas, render tests, admin tests, styleguide previews

- [ ] `image`: single image with media asset, alt/decorative choice, caption, credit, aspect ratio, focal point, alignment, and optional validated link.
- [ ] `embed`: provider + URL + title + aspect ratio; initially allowlist YouTube, Vimeo, approved map providers, and approved form/document providers. Render sandboxed iframe with lazy loading. No raw `dangerouslySetInnerHTML`.
- [ ] `resource_list`: manual/filtered resources with title, description, file type/size, product/category filters, and download/open behavior.
- [ ] `columns`: 2–3 columns containing a constrained set of text/image/CTA items; do not create recursive arbitrary nesting in the first version.
- [ ] `quote_testimonial`: quote, attribution, role/company, optional portrait/logo, and optional source link.
- [ ] `button_group`: one to three validated CTAs for cases that do not warrant a full CTA band.
- [ ] Add descriptions, suitable-use guidance, and thumbnails/icons to every old and new palette entry.
- [ ] Review whether divider/spacer blocks are genuinely needed after columns and per-section spacing. Do not add them if they only enable inconsistent visual hacks.

**Acceptance:** An editor can build a conventional marketing page with headings, rich text, images, video/embed, links/buttons, downloads, columns, quote/testimonial, accordions, cards, and forms without developer intervention.

### Task 10: Add reusable global sections and configurable forms

**Files:**
- Create: migrations for reusable sections and form definitions/fields
- Create: repositories/actions/admin routes
- Add: `shared_section` and generic `form` blocks
- Modify: block renderer with cycle/depth protection

- [ ] Create reusable sections with a stable key, title, draft/published version, and ordered blocks.
- [ ] Add a reference block that renders a published reusable section; prohibit cycles and enforce a small maximum nesting depth.
- [ ] Seed shared CTA/contact sections only from existing approved content.
- [ ] Create form definitions with configurable fields limited to text, email, telephone, textarea, select, checkbox/consent, and hidden page context.
- [ ] Configure recipient/notification behavior outside block data; do not expose secrets in the admin.
- [ ] Reuse the existing submissions inbox with form name, schema version, validation, spam protection, and export/retention decisions.
- [ ] Keep the existing contact block as a compatibility preset backed by the generic form engine.

**Acceptance:** Updating a published shared section updates all references only through its explicit Publish action. At least two distinct forms can be created without code changes.

---

## Phase 4 — Media and asset management

### Task 11: Generalize and harden the media library

**Files:**
- Modify: media schema/migration, `lib/data/media.ts`, media actions
- Refactor: media picker and media-library UI into shared components
- Modify: `FieldSpec` to distinguish image/file/video asset requirements

- [ ] Support approved images and documents; support hosted video only after defining file-size, bandwidth, and provider limits. External video remains an embed.
- [ ] Enforce MIME type, extension, and maximum size server-side.
- [ ] Capture image width/height and preserve original filename; add title, alt, caption/credit, folder/tags, and replacement metadata.
- [ ] Make alt text required for meaningful images and allow an explicit decorative flag instead of fake/empty descriptions.
- [ ] Store/select a media asset identity rather than only copying a URL for new content. Maintain legacy URL compatibility during migration.
- [ ] Add a usage view across blocks, products, news, directory, settings, and resources.
- [ ] Block deletion while referenced, with a replace-everywhere flow for administrators.
- [ ] Make storage upload + metadata creation compensating/atomic: remove the object if row creation fails; do not delete the row if object deletion fails silently.
- [ ] Add server-side pagination, debounced search, stale-request protection, folders/tags, and metadata editing.
- [ ] Extract shared `MediaBrowser`, upload form, search, grid, card, and empty/loading states used by both picker and library.

**Acceptance:** No media deletion can break a live page unnoticed. More than 60 assets remain browseable. Alt/metadata changes do not require re-uploading.

---

## Phase 5 — Admin usability, accessibility, and component cleanup

### Task 12: Consolidate duplicated admin UI

**Files:**
- Create: `components/admin/ui/*`
- Refactor: page/product/entity/user lists and product/entity/settings editors

- [ ] Extract shared `AdminPageHeader`, `AdminDataTable`, `StatusBadge`, `FormCard`, `AsyncMessage`, `EmptyState`, `ConfirmDialog`, pagination, and row-action components.
- [ ] Keep domain-specific editors separate where their data model differs; do not force page blocks and product children into one abstraction.
- [ ] Consolidate product/entity/settings save/error shells around one form-layout component.
- [ ] Replace native `prompt()`/`confirm()` in page duplication, rich-text links, restore, and deletion with accessible dialogs that can show consequences and field validation.
- [ ] Remove render-time `setState` from the standalone media library.

**Acceptance:** The four repeated admin table implementations and three repeated editor shells use shared primitives, while domain logic remains readable.

### Task 13: Improve editor workflow and information architecture

**Files:**
- Modify: admin layout/navigation, list pages, page editor, block palette, preview workflow

- [ ] Add responsive sidebar/drawer, visible active section, grouped navigation, role-aware items, breadcrumbs/back/cancel controls, and horizontal table scrolling.
- [ ] Add page/product/entity search, status filters, sorting, pagination, and URL-backed state.
- [ ] Replace the block dropdown with a searchable categorized palette showing description, thumbnail, and common use.
- [ ] On validation failure, open, scroll to, and focus the affected block/field.
- [ ] Add duplicate-near-source behavior for blocks rather than appending duplicates to the end.
- [ ] Add keyboard block reordering via dnd-kit `KeyboardSensor` and explicit Move Up/Down alternatives.
- [ ] Add an unsaved-changes guard. After the real draft boundary is complete, add debounced autosave only if conflicts and failure states are clearly visible.
- [ ] Provide preview refresh/status feedback and clearly state whether the displayed version is saved draft or published.
- [ ] Add dashboard counts for drafts awaiting publication, broken links, missing required media metadata, new submissions, and recent audit activity.

**Acceptance:** A first-time editor can locate content, add/reorder/configure a block, find a validation error, preview, and save without developer knowledge or losing work.

### Task 14: Complete accessibility and interaction remediation

**Files:**
- Modify: admin auth forms, field renderer, media dialogs, tables, navigation, page editor, public search/video/embed components, global layout/CSS

- [ ] Add persistent labels, `name`, correct input types/input modes, autocomplete, and spellcheck settings to every form control.
- [ ] Add `aria-live="polite"` status regions for saves, uploads, validation, login, and submission updates.
- [ ] Add skip links and confirm heading hierarchy across admin/public layouts.
- [ ] Ensure every icon-only control has an accessible name and every decorative icon/image is hidden appropriately.
- [ ] Ensure dialogs have programmatic titles/descriptions, focus containment/restoration, Escape behavior, and contained overscroll.
- [ ] Preserve the universal focus-visible treatment; remove any outline suppression without an equivalent replacement.
- [ ] Add captions/transcript/description fields for meaningful video content.
- [ ] Ensure stateful tabs/filters use correct semantics and URL-backed state where shareable.
- [ ] Verify admin at narrow, tablet, and desktop widths with keyboard-only navigation and reduced motion.
- [ ] Run axe against login, every admin editor/list, media dialog, block palette, public home/products/product/news/resources/contact/search, and 404.

**Acceptance:** No serious/critical axe violations, all CMS operations are keyboard-completable, and focused controls are visible and unobscured.

---

## Phase 6 — Hardening, migration cleanup, and documentation

### Task 15: Add content integrity and operational safeguards

**Files:**
- Create: link/media/content integrity utilities and admin report
- Modify: publish actions, delete actions, redirects, sitemap/search

- [ ] Run a publish preflight that checks required fields, unsafe URLs, missing category/routes, missing media, duplicate anchors, and invalid blocks.
- [ ] Warn when slug changes require a redirect; offer to create the redirect atomically.
- [ ] Reject redirect loops and chains beyond the agreed limit.
- [ ] Add a broken-link/media-usage report and a production-friendly CLI command.
- [ ] Define archive/soft-delete behavior for pages, products, news, resources, and submissions; reserve irreversible deletion for admins with a retention policy.
- [ ] Add backup/restore documentation and verify recovery of a page version and product with children.
- [ ] Decide submission export and retention requirements; implement CSV export only if approved.

**Acceptance:** Publish and delete operations communicate impact, broken internal references are detectable before launch, and recovery is documented and tested.

### Task 16: Final regression, content migration, and user guide

**Files:**
- Update: migration/seed scripts, `CLAUDE.md`, `docs/DECISIONS.md`, `docs/CONTENT-GAPS.md`
- Replace/update: `docs/CLIENT-HANDBOOK.md`
- Add no new guide until the final verified UI exists

- [ ] Write idempotent migrations for existing pages, blocks, products, media, and navigation into the final model.
- [ ] Run a dry-run report before applying migrations; back up production data first.
- [ ] Re-run every seed/migration script twice to prove idempotency.
- [ ] Run lint, TypeScript, unit/integration/e2e tests, production build, link crawler, axe, and Lighthouse on target routes.
- [ ] Perform role-based acceptance passes as editor and admin.
- [ ] Reconcile every item in this plan against the original audit; record intentionally deferred optional items with owner/reason.
- [ ] Rewrite the user guide from the verified interface, covering roles, pages/blocks, drafts/publish/preview/revisions, products/taxonomy, news/resources, navigation, media, reusable sections, forms/submissions, redirects, users, audit/history, and recovery.
- [ ] Remove or correct outdated handbook statements, especially editor publishing, draft visibility, and media deletion behavior.

**Acceptance:** All checks pass against the production build, migrated content is intact, every original audit finding is closed or explicitly accepted, and the user guide matches the released CMS exactly.

---

## Recommended execution slices

1. **Release safety:** Tasks 1–6. Do not add blocks before real drafts, permissions, transactions, and validation are in place.
2. **Make current features truthful:** Tasks 7–8. Close broken routes, dead fields, categories, and unused sources of truth.
3. **CMS completeness:** Tasks 9–11. Add the general-purpose blocks, reusable sections/forms, and robust asset handling.
4. **Editorial quality:** Tasks 12–14. Consolidate UI and complete usability/accessibility work.
5. **Launch and guide:** Tasks 15–16.

## Global definition of done

- [ ] No admin-visible field is dead.
- [ ] No visible internal link reaches a 404 or placeholder `#` unless deliberately marked unavailable to administrators and hidden from visitors.
- [ ] Draft saves cannot affect published content.
- [ ] Editor/admin capabilities are enforced in UI, actions, and RLS.
- [ ] Compound writes roll back on failure.
- [ ] Audit history covers every mutation.
- [ ] All block data and action inputs are validated server-side.
- [ ] Media deletion cannot silently break published content.
- [ ] The admin is responsive, keyboard accessible, and has no serious axe findings.
- [ ] `pnpm check` and `pnpm build` pass from a clean checkout.
- [ ] The final user guide has been verified screen-by-screen against the released admin.
