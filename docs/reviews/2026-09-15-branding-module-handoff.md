# Branding module and block theming — implementation handoff

Date: 2026-09-15  
Plan: `docs/superpowers/plans/2026-09-15-branding-module-and-block-theming.md`  
Configuration version: `1`

## Outcome

Phases 0–9 are implemented in the current workspace. The CMS now has a
dedicated, capability-protected Branding module with an independent
draft/publish/revision workflow. Published branding controls the public logo,
governed color system, semantic surfaces, typography roles, and inheritable
defaults for all 34 registered block types. The admin shell remains visually
isolated and neutral.

## Phase summary

- **0–1:** token/font/block inventory; exact OSI fallback; versioned branding
  schema; draft/publication/revision tables; RLS; optimistic concurrency;
  atomic save/publish/restore/reset; audit; full-config contrast validation.
- **2–3:** nine-entry font catalog; public-only static font declarations;
  server published resolver; deterministic safe theme compiler; no-flash
  public boundary; semantic public shell/primitives with legacy utility
  compatibility.
- **4:** exhaustive block capability map; strict optional instance appearance;
  block default/inheritance resolver; safe legacy-background adapter; renderer
  CSS-variable boundary.
- **5–6:** `/admin/branding`; logo/media selector; governed palette; semantic
  role and surface editor; typography and block-type defaults; save, publish,
  reset, history, restore; page/shared-section appearance controls and
  server-side reference/capability validation.
- **7:** isolated iframe preview with draft/live and three viewport widths;
  origin-checked, Zod-validated message bridge; real-page preview using saved
  branding draft across logo, chrome, and route content.
- **8:** media usage/replacement integration; brand-token usage discovery;
  historical fallback behavior; migration 0035 for atomic logo replacement
  and unique revision versions.
- **9:** published semantic styleguide, client handbook, architecture and
  decisions documentation, public visual/accessibility regression, and this
  handoff.

## Important files

| Area | Files |
| --- | --- |
| Schema and fallback | `lib/branding/schema.ts`, `lib/branding/seed.ts` |
| Theme and resolution | `lib/branding/theme.ts`, `lib/branding/resolve.ts`, `components/branding/public-theme-boundary.tsx` |
| Fonts | `lib/fonts/catalog.ts`, `lib/fonts/public-fonts.ts` |
| Block theming | `lib/blocks/appearance-capabilities.ts`, `lib/branding/block-appearance.ts`, `components/blocks/block-renderer.tsx` |
| Admin | `app/admin/(dashboard)/branding/page.tsx`, `components/admin/branding-editor.tsx`, `components/admin/block-appearance-fields.tsx` |
| Preview | `app/branding-preview/page.tsx`, `components/branding/branding-preview-receiver.tsx`, `components/admin/branding-preview-frame.tsx` |
| Integrity | `lib/branding/usage.ts`, `lib/data/branding-usage.ts`, `lib/data/media.ts`, `lib/validation/block-appearance.ts` |
| Database | `supabase/migrations/0032_site_branding.sql` through `0035_branding_media_replacement.sql` |
| Documentation | `docs/BRANDING.md`, `docs/CLIENT-HANDBOOK.md`, `docs/DECISIONS.md`, public `/styleguide` |

## Security and correctness properties

- Public routes read only the publication; authenticated preview is the only
  public renderer permitted to read the draft.
- Invalid persisted or runtime configuration falls back as one unit to the
  code-owned OSI seed; partial hostile values are never emitted.
- Only opaque `#RRGGBB` swatches, stable references, compatible catalog font
  keys, and registered block keys are accepted.
- Required text/surface and status/surface pairs must pass the configured
  contrast rules before publication. The universal focus color is fixed.
- Page/shared-section actions validate appearance again on the server, so
  client manipulation cannot store unpublished or unsupported references.
- Preview messaging accepts same-origin structured configuration only. No raw
  CSS, HTML, JavaScript, classes, font URL, or stylesheet URL enters the
  compiler.
- Logo replacement updates draft and publication together in the database;
  historical snapshots retain deterministic text-logo fallback behavior.

## Verification record

The final verification commands and counts should be read together with the
limitations below:

- `pnpm check` — ESLint and TypeScript clean; 80 Vitest files / 646 tests passed.
- `pnpm build` — Next.js production compilation and route generation.
- `pnpm exec playwright test tests/e2e/accessibility.spec.ts --project=chromium --grep 'public site'` — 13/13 passed, including the published semantic styleguide.
- `pnpm exec playwright test tests/e2e/branding-theme.spec.ts tests/e2e/public-routes.spec.ts --project=chromium` — 24 passed, 2 data-dependent detail routes skipped as designed.
- Desktop and 375px public-home screenshots were inspected with normal and
  reduced-motion behavior. The published OSI seed retained the intended
  dark chrome, cream reading surfaces, gold accents, responsive header, and
  readable mobile hero.

Two real visual defects were caught and corrected during this pass:

1. Runtime Tailwind color aliases initially resolved at `:root`, before the
   scoped theme values existed, leaving dark chrome transparent. The compiler
   now emits concrete semantic aliases on the public boundary.
2. Treating one block accent as both “accent on dark” and “accent on light”
   caused product-action contrast failures. Action fills remain semantic and
   contrast-safe; block accents now affect only declared decorative/text
   accent slots.
3. The styleguide's empty media fixture combined muted text with a translucent
   sand background at only 4.22:1. The shared media primitive now uses the
   validated raised surface and semantic muted-text role.

## Deployment and operational steps

1. Review and apply `supabase/migrations/0035_branding_media_replacement.sql`
   to the target Supabase project.
2. Run the Supabase security/performance advisors and regenerate database
   types if the migration changes generated output.
3. Deploy the application only after the migration is present, because media
   replacement can call `replace_branding_logo_asset_atomic`.
4. With an authorized admin account, smoke-test draft save, isolated preview,
   publish, live public output, revision restore, real-page preview, and logo
   replacement.

## Known limitations and deliberate boundaries

- Migration 0035 has been added to the repository but was not applied to the
  remote database in this implementation session. No production deployment
  was performed.
- Admin credentials were not available, so the new authenticated Branding UI
  could not receive a final live browser/axe click-through in this session.
  Its route, capability guard, data contracts, build, types, and domain tests
  were verified; the authenticated route is also included in the existing axe
  matrix for the credentialed CI environment.
- The active palette is a fixed set of twelve editable governed brand slots.
  Administrators can rename/recolor them, but the UI does not add or delete
  swatches. This intentionally prevents dangling references; the usage scanner
  is already present for a future atomic delete/reassignment product flow.
- Uploaded fonts, arbitrary external fonts, arbitrary CSS, gradients, layout
  geometry, and admin recoloring remain explicit non-goals.
- Production Lighthouse/Core Web Vitals, a physical-device pass, and a manual
  screen-reader pass require the deployed environment and remain release
  checks rather than local implementation checks.
