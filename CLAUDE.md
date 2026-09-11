@AGENTS.md

# OSI website rebuild — conventions

Replacing odessaseparator.com (currently Wix) with Next.js (App Router) +
Supabase + a lightweight block-based CMS. Full spec lives in the original
master prompt; this file captures the conventions and constraints that
must hold across every phase. Design fidelity → admin usability → content
completeness → performance/SEO, in that priority order.

## Non-negotiable constraints

1. **The mockup is the spec** (`docs/design/OSI Mock-Up 9-3-2026.pdf`, 8
   pages). Every visual decision traces back to it. Where it's silent,
   extend its language — never fall back to generic shadcn/template
   looks. Restyle any Radix/shadcn primitives completely.
2. **Supabase is temporary** (MVP database only, migrating off later):
   - Schema changes are plain portable `.sql` files in
     `supabase/migrations/` — no Supabase-proprietary DDL outside
     auth/storage glue.
   - **All DB access lives in `lib/data/*.ts`.** No `supabase` or
     `@supabase/*` import in any component, page, or route handler.
     Components call `lib/data` functions; those call `lib/db/client.ts`.
     Swapping the driver later = editing `lib/db/client.ts` +
     `lib/data/*` only.
   - No Realtime, Edge Functions, or PostgREST-specific query tricks.
     Auth goes behind `lib/auth/*` (nothing outside that file imports
     `@supabase/ssr`'s auth helpers directly).
   - Supabase MCP tools are available for inspecting/applying
     migrations, but the repo's migration files are the source of truth.
3. **Legacy media stays on the legacy host for now.** Store absolute
   URLs. Every media URL renders through `lib/media.ts →
   resolveMediaUrl()`, backed by `NEXT_PUBLIC_LEGACY_MEDIA_BASE`. Add new
   legacy hosts to `next.config.ts → images.remotePatterns` (never
   `images.domains`, deprecated in Next 16) as they're discovered.
4. **Never invent client content.** Product specs, copy, names, contacts
   come from `content/legacy/`. Mockup lorem ipsum → seed
   `[PLACEHOLDER — awaiting client copy]` and log it in
   `docs/CONTENT-GAPS.md`. Never fabricate oilfield equipment specs.
5. **Minimal footprint.** No out-of-scope refactors, no unexplained new
   dependencies, no stray `.md` files beyond `CLAUDE.md`,
   `docs/DECISIONS.md`, `docs/CONTENT-GAPS.md`. Ask before deviating from
   an established decision.
6. **English only** for UI/code/comments/docs. Schema is i18n-ready
   (`locale` column) but no language switcher ships. Exception: legacy
   legal/policy content that is genuinely Spanish-language in the source
   (e.g. the Colombian SG-SST page) stays as-is — that's regulated
   content, not UI copy.

## Stack

Next.js 16 (App Router, TS strict), Tailwind v4, Supabase Postgres +
Auth, React Hook Form + Zod (one schema per block type), Tiptap
(`jsonb`), `@dnd-kit/core`, `next/image`, Vercel, Vercel Analytics. No
headless CMS (Sanity/Payload/Strapi) — the admin is ours, in-repo.

Libraries are added only when the phase that needs them starts (RHF/Zod,
Tiptap, dnd-kit land in Phases 2–5), not all up front.

## Next.js 16 specifics (this project was scaffolded on 16.3.4)

This is newer than most training data — read
`node_modules/next/dist/docs/` before assuming Next 15 behavior.
Specifics that affect this project:

- **`middleware.ts` is deprecated** → use `proxy.ts` exporting `proxy()`.
  Admin auth gating (Phase 5) goes here. `proxy` runs on `nodejs` only,
  no edge runtime.
- `params`, `searchParams`, `cookies()`, `headers()`, `draftMode()` are
  **always async** — no sync fallback. Use the generated `PageProps`,
  `LayoutProps`, `RouteContext` helpers (run `next typegen` if types are
  stale).
- `images.remotePatterns`, not `images.domains` (removed).
- `revalidateTag(tag, profile)` now takes a required second argument
  (e.g. `'max'`). Use `updateTag` in Server Actions instead when a
  mutation needs read-your-own-writes (e.g. publish/unpublish in the
  admin should feel instant to the editor).
- `cacheComponents` (formerly experimental PPR) stays **off** for this
  project — content is DB-driven with draft/published state; explicit
  cache boundaries aren't worth the complexity for an MVP CMS. Revisit
  only if a specific page's performance demands it.
- Turbopack is the default for both `dev` and `build` now — no flag
  needed.
- `next lint` is removed; lint via the `eslint` CLI directly (already
  wired as the `lint` script).

## Repo layout so far

```
app/(site)/              public marketing routes, wrapped with
                         Header/Footer (route group layout sets
                         `dynamic = "force-dynamic"` — see below)
app/styleguide/          design reference, outside the (site) group
components/ui/           design-system primitives (Phase 1)
components/layout/       Header (mega menu) + Footer
components/blocks/       one file per block type + shared bits
                         (block-renderer.tsx, label-plate-grid.tsx)
lib/blocks/              registry.ts, types.ts, common.ts (shared Zod
                         base schema: anchorId/background/spacing)
lib/actions/             Server Actions ("use server"), e.g. the
                         contact form submit handler
lib/db/client.ts         Supabase client factories — the only file that
                         imports @supabase/ssr's client constructors
lib/db/database.types.ts generated types (regenerate after schema changes
                         via the Supabase MCP generate_typescript_types
                         tool — don't hand-edit)
lib/data/                repositories, one file per entity — pages,
                         products, taxonomy, news, resources, locations,
                         navigation, settings, forms
lib/auth/                thin auth adapter (Phase 5)
lib/media.ts             resolveMediaUrl() — the only legacy-media seam
content/legacy/          scraped Odessa Separator site (19 pages), the
                         Phase 4 migration script's input — don't hand-edit
docs/design/             the mockup PDF
supabase/migrations/     plain SQL migrations, numbered, applied via the
                         Supabase MCP apply_migration tool
scripts/                 one-off/idempotent Node scripts run via
                         `pnpm exec tsx --env-file=.env.local <file>`
```

Every route under `app/(site)/` reads live Supabase content (draft vs
published can change at any time via the future admin), so its layout
sets `export const dynamic = "force-dynamic"` — without it, Next tries
to statically prerender and fails the build the moment a data call
touches `cookies()` (which `lib/db/client.ts` always does for session
handling).

## Schema conventions (Phase 2)

Every content table (`pages`, `products`, `news_posts`, `services`,
`industries`, `applications`, `locations`, `directory_contacts`,
`resources`) has a `status` ('draft'|'published') column, even the ones
the master prompt didn't spec one for (§5.3/§5.5 — added for consistency
with the blanket RLS rule in §5.8; see `docs/DECISIONS.md`). RLS on every
table follows one pattern:

- One SELECT policy: `status = 'published' OR public.is_staff()` (or
  `true` for structural tables with no draft state — nav, media,
  settings, redirects, categories). Don't add a second permissive SELECT
  policy for staff — that was tried and reverted (Supabase's performance
  advisor flags "multiple permissive policies").
- Separate staff-only INSERT/UPDATE/DELETE policies using
  `public.is_staff()`.
- `public.is_staff()` / `public.is_admin()` (role='admin' only, used for
  managing `admin_profiles` itself) are `security definer` functions
  defined in `0001_helpers_and_admin.sql` — reuse them, don't re-derive
  the "am I staff" check inline.
- Child tables of `products`/`pages` (benefits, stages, specs, blocks,
  junctions) gate SELECT through the parent's `status`, not their own.

After any migration, run `get_advisors` (security + performance) via the
Supabase MCP and fix what it flags before moving on.

## Block registry (Phase 3, done)

`lib/blocks/registry.ts` maps `type → BlockDefinition` (`label`,
`category`, `schema`, `defaults`, `Render`, `adminFields` — see Phase 5
section below). All 26 blocks from the master prompt §6 are implemented in
`components/blocks/`, rendered by `BlockRenderer` (unknown type or a
schema validation failure never crashes the page — a loud diagnostic in
dev, silently skipped in prod). Adding a block = one file + one registry
entry, same as before.

**Critical gotcha — client blocks must split their file.** A block whose
`Render` needs interactivity (`"use client"`) CANNOT also export its
`schema`/`defineBlock(...)` from that same file: Next's client/server
boundary means non-component exports from a `"use client"` module come
through as unusable references when read server-side (which is exactly
what the registry does — `definition.schema.safeParse(...)` blew up with
`schema` silently `undefined`). Fix, and the pattern to follow for every
new interactive block: put the client component in `<name>-client.tsx`
(`"use client"`, no schema/registry code), and keep `<name>.tsx` (no
directive) holding the Zod schema + `defineBlock(...)`, importing the
`Render` from the client file. See `contact-form.tsx` /
`contact-form-client.tsx`, `stages-carousel.tsx` /
`-carousel-client.tsx`, `video-embed.tsx` / `-embed-client.tsx`.

**Product detail pages don't use page_blocks.** `products` + its child
tables (`product_benefits`/`product_stages`/`product_specs`) are fixed,
relational structure, not freeform CMS content, so
`app/(site)/products/[category]/[slug]/page.tsx` calls
`getProductBySlug()` and composes `ProductHeroRender`,
`BenefitsCardsRender`, `StagesCarouselRender`, `HowItWorksRender`,
`SpecTableRender` directly with mapped props — the same Render
components the registry uses for `product_hero`/`benefits_cards`/etc.,
just invoked outside `BlockRenderer`. Home, `/products` (listing), and
`/contact` do go through `pages`/`page_blocks`/`BlockRenderer`.

Seeding: `pnpm seed:navigation` (mega/utility/footer nav), `pnpm
seed:home`, `pnpm seed:static-pages` (`/products` listing, `/contact`),
`pnpm seed:products` (the 3 real products). All idempotent — re-run
after editing a seed script.

## Design tokens (Phase 1 builds these; noted here so nothing forgets them)

Orbitron (display, always uppercase, wide tracking) + Montserrat (body,
light weight, 1.7 line-height). Palette: navy `#001B33`/`#04243D`, cream
`#F2E9DE`, gold `#E2902A` (scarce, load-bearing accent only — never body
text). Six signature motifs to build as primitives before any page:
angled corner clips, circled-arrow buttons, hairline grid overlay,
label-plate cards (one "open" per grid), duotone photography, breakout
gold CTA bar. Full detail in the master prompt §4.

## Motion (Phases 1–2 of the redesign, done)

`motion` (Framer Motion) is the only animation dependency. Shared tuned
constants live in `lib/motion/variants.ts` (`EASE_OSI` mirrors the CSS
`--ease-osi` curve — never introduce a second easing curve). CSS
keyframe utilities (`animate-float`, `animate-gradient-shift`,
`animate-marquee`, `animate-spin-slow`, `animate-pulse-glow`,
`animate-pulse-glow-gold`) are declared in `app/globals.css` and must
always be used with a `motion-safe:` prefix at the call site.

Primitives in `components/ui/`: `RevealSection` (internal, drives
`Section`'s `reveal` prop), `AnimatedSection` (single fade+rise),
`AnimatedGroup` + `AnimatedItem` (staggered grids), `TiltCard`,
`GradientText` (gold sweep, **navy backgrounds only**), `MarqueeStrip`.
All visible primitives are previewed on `/styleguide`.

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

## Phase discipline

Work proceeds in the 8 phases from the master prompt (0 Foundation → 1
Design system → 2 Schema → 3 Blocks/public rendering → 4 Content
migration → 5 Admin CMS → 6 Forms/search/SEO → 7 Hardening). Plan each
phase briefly, get a go-ahead, then build. `pnpm build`, `pnpm lint`,
`pnpm exec tsc --noEmit` must be clean at the end of each phase.

## Legacy content migration (Phase 4, done)

`scripts/migrate-legacy.ts` migrates every remaining legacy page
(about-us, careers, hiring, hse, sg-sst-policies, terms/privacy, the 3
services sub-pages, machine-shop, services listing) into `pages`/
`page_blocks`, all landing `status='draft'`. `scripts/migrate-directory.ts`
separately hand-curates `osi-directory.json` into `directory_contacts`/
`locations` — see `docs/DECISIONS.md` for why that one isn't generic.
Both are idempotent (`pnpm migrate:legacy [--dry-run]`, `pnpm
migrate:directory`) and regenerate `docs/MIGRATION-REPORT.md`.

The legacy scrape's `headings[]`/`paragraphs[]` arrays are separate
flat lists with no positional link to each other or guaranteed
substring-safety against `raw_text` — see the `reconstructDocOrder`
comment in `scripts/migrate-legacy.ts` before writing any other parser
against `content/legacy/`. Short version: use a two-pointer scan with a
single monotonically-advancing cursor (not independent per-text
`indexOf`), and match on whitespace-stripped fingerprints (the scraper
sometimes joins two text nodes into one `paragraphs[]` entry with no
separator that `raw_text` still has on two lines).

Generic migrated pages render through the same `pages`/`page_blocks`/
`BlockRenderer` pipeline as home/products/contact, via a catch-all route
(`app/(site)/[...slug]/page.tsx`) that joins the segment array into a
slug — generalizes the master prompt §7 sitemap's single-segment
`/[slug]` to support nested paths like `careers/hiring`.

## Admin CMS (Phase 5, in progress)

Auth: `lib/auth/index.ts` (the one other file besides `lib/db/client.ts`
allowed to import `@supabase/ssr` directly — `proxy.ts` runs in a
middleware context that can't use `next/headers`' `cookies()`). No public
signup; the first (and so far only) admin account is bootstrapped via
`pnpm create-admin <email>` (Supabase Auth `inviteUserByEmail`). `/admin/*`
is gated by `proxy.ts` → `guardAdminRequest()`; `requireAdmin()` /
`requireAdminRole()` guard individual Server Components/Actions.

**Admin forms are driven by hand-written `FieldSpec[]` metadata, not Zod
introspection** — see the decision in `docs/DECISIONS.md` for why.
`lib/blocks/admin-fields.ts` defines the `FieldSpec` union (text,
textarea, number, boolean, select, image, richtext, object, array) and
`COMMON_ADMIN_FIELDS` (background/spacing/anchor, prepended to every
block). Every block file now exports `adminFields` next to its schema.

- `components/admin/field-renderer.tsx` — recursive `FieldSpec` → React
  Hook Form field renderer (`useFieldArray` for `array`, indefinite
  nesting for `object`/`array.itemFields`). Untyped (`Control<any>`) by
  necessity — the form shape is a different Zod-derived object per block
  type, so there's no static type to give RHF. This file and
  `page-editor.tsx` are the only places that `any` is allowed for that
  reason.
- `components/admin/block-fields-form.tsx` — renders one block instance's
  full field set (`COMMON_ADMIN_FIELDS` + the block's own `adminFields`)
  flat under a `namePrefix` like `blocks.3.data`, matching how
  `blockCommonSchema.extend(...)` flattens into a single `page_blocks.data`
  object.
- `components/admin/media-picker.tsx` — a `<dialog>`-based picker/uploader
  bound to `type: "image"` fields via RHF `Controller`. Uploads go through
  `lib/actions/media.ts` → `lib/data/media.ts` → Supabase Storage bucket
  `media` (migration `0015_media_storage_bucket.sql`; public read,
  staff-only write — the "storage glue" exception to constraint 2). This
  is for **new** admin uploads only — legacy images still resolve through
  `lib/media.ts` per constraint 3; add the Supabase project's storage host
  to `next.config.ts → images.remotePatterns` if the project ever changes.
- `components/admin/rich-text-editor.tsx` — Tiptap bound to `type:
  "richtext"` fields, StarterKit with blockquote/codeBlock/
  horizontalRule/strike/code all disabled and heading capped to
  levels [2, 3] — must stay in lockstep with the restricted reader in
  `components/blocks/rich-text.tsx` (paragraph/heading(h2/h3)/bulletList/
  orderedList/listItem/text+bold/italic/link) so the editor can never
  produce a doc the public site can't render.

**Password reset** (`/admin/forgot-password` → email → `/admin/reset-password`):
Supabase's reset-password email redirects the browser with the recovery
session in the URL's *hash fragment* (`#access_token=...&type=recovery`
— confirmed by a real expired-link error, `#error=access_denied&
error_code=otp_expired`), which is never sent to the server, so
`app/admin/reset-password/reset-password-form.tsx` has to read it and
call `setSession`/`updateUser` client-side. That needs a browser
Supabase client, and — subtlety — it **cannot** import
`lib/db/client.ts` to get one despite that being the sole client-
constructor boundary everywhere else: that file also imports
`next/headers` at module scope for `createServerDbClient`, and Next.js
bundles the whole module for any importer, breaking the client build
outright. `lib/auth/client.ts` constructs its own browser client
directly for this one reason — see its top comment. `proxy.ts` also
treats `/admin/forgot-password` and `/admin/reset-password` as public,
alongside `/admin/login` (no session exists yet when either loads).

**The page editor** (`app/admin/(dashboard)/pages/[id]/page-editor.tsx`)
is one React Hook Form instance over `{ ...page meta, blocks: [...] }`.
Blocks are a top-level `useFieldArray`, reordered via `@dnd-kit` (sortable
by the RHF field `id`, not array index — index changes on every reorder).
Adding a block appends `{ type, is_visible: true, data: defaults }` using
the block's plain-data `defaults` from the palette (see below). Save
(`lib/actions/pages.ts → saveDraftAction`) re-validates every block's
`data` against its real Zod schema server-side before writing — this is
the same validation `BlockRenderer` relies on at render time, just run
earlier so a bad save surfaces immediately in the editor UI (e.g. adding
an `accordion` with 0 items and clicking Save shows "Accordion: Too
small..." right there, block never hits the DB). Publish snapshots
`{ meta, blocks }` into `page_revisions` before flipping `status` (master
prompt §5.1); the revisions panel calls `restorePageRevision` to overwrite
the current draft from a snapshot.

`lib/blocks/registry.ts → getBlockPalette()` returns a **client-safe**
summary (`type`, `label`, `category`, `adminFields`, `defaults`) —
`BlockDefinition` itself carries a `ZodType` and a `Render` component,
neither serializable to a Client Component, so the full registry never
crosses that boundary; only this flattened palette does.

**Preview** (`app/(site)/preview/[...slug]/page.tsx`) reuses
`BlockRenderer` against `getPageBySlugForPreview()` (same as public
`getPageBySlug` but without the `status = 'published'` filter), gated by
`requireAdmin()` rather than a signed token — simpler than the master
prompt's implied token mechanism, and sufficient since the only viewer is
an already-authenticated staff session. Revisit with real signed tokens
if the client wants to share unauthenticated preview links externally.
Reflects the last **saved** draft, not unsaved form edits.

**Entity admin** (`app/admin/(dashboard)/[entity]/`, `lib/admin/entity-config.ts`)
is one list + one edit screen reused across every simple content table —
industries, applications, news, resources, locations, directory,
redirects — driven by the same `FieldSpec`/`FieldRenderer` engine the block
editor uses, plus two more `FieldSpec` variants added for this:
`relation` (a `<select>`, e.g. `resources.product_id`) and `multi-relation`
(a checkbox list bound to an array of ids, e.g. junction tables). Options
for both are resolved server-side (`lib/data/admin-entities.ts →
listRelationOptions`) and handed to the client via a `RelationOptionsProvider`
context (`components/admin/relation-options.tsx`) rather than baked into
the static `FieldSpec`, since they depend on live DB content. The repo
layer (`lib/data/admin-entities.ts`) is intentionally generic — `table` is
a runtime string, not a `Database` key, so it leans on `any` at the
Supabase-call boundary the same way `field-renderer.tsx` does; see
`docs/DECISIONS.md`. A literal route (e.g. `app/admin/(dashboard)/
products/`) always wins over the `[entity]` dynamic segment for the same
path, which is how `/admin/products` gets its own bespoke editor (child
tables — benefits/stages/specs — plus the industries/applications
many-to-many) while still sharing the same `FieldRenderer` machinery
(`lib/admin/product-fields.ts`) instead of a third form system.

**Navigation** (`/admin/navigation`) edits `nav_items` one level deep
(top-level items + their direct children) — matches every menu
`scripts/seed-navigation.ts` actually seeds; the schema's arbitrary
`parent_id` nesting isn't exposed further than that in the UI.

**Media library** (`/admin/media`) is the same `lib/data/media.ts` /
Supabase Storage bucket the in-form `MediaPicker` uses, as a standalone
browse/upload/delete page.

**A real bug worth knowing about:** `MediaPicker`'s `<dialog>` (with its
own upload `<form>`) is portaled to `document.body` via `createPortal`,
not rendered inline. Every caller renders `MediaPicker` inside its own
`<form>` (entity editor, product editor, settings, and — for `image`
fields — the block editor), and HTML forbids a nested `<form>`; rendering
it inline caused a real hydration failure, caught by inspecting the dev
server's console output after a Playwright pass (production `next build`
alone did not catch it — hydration mismatches are a runtime-only failure
mode). The portal mounts only after `useSyncExternalStore` confirms
client-side (same trick as `recommendations-client.tsx`) since
`document.body` doesn't exist during SSR. Relatedly, `image` and
`richtext` fields use a plain `<div>` wrapper (`FieldGroup` in
`field-renderer.tsx`), not `<label>` — a `<label>` is for associating text
with an actual form control, and wrapping a button-driven or
contenteditable widget in one instead made that widget's own interactive
elements unreachable by accessibility role (found the same way, via
Playwright's `getByRole` failing to locate a button that plainly
existed).

## Forms, search, SEO (Phase 6)

**Contact form** (`lib/actions/submit-contact-form.ts`): honeypot (Phase
3) → rate limit (max 3 submissions per IP-hash per 10 minutes, checked
against `form_submissions` via the **service-role** client — RLS only
grants that table's SELECT to staff, so the anon client can't read back
even its own rows) → insert (`ip_hash` is a salted SHA-256 of
`x-forwarded-for`, never a raw IP) → best-effort notification email via
`lib/email.ts` (Resend; silently no-ops if `RESEND_API_KEY`/
`CONTACT_NOTIFICATION_EMAIL`/`RESEND_FROM_EMAIL` aren't set — see
`docs/CONTENT-GAPS.md`, the recipient was never confirmed). A submission
is never lost to an email failure — it's already durably saved before
the notification is attempted.

**Search** (`/search`, `lib/data/search.ts`) is Postgres full-text, no
external service: migration `0016_search_vectors.sql` adds a generated
`search_vector` column (title/name weighted `'A'`, a short secondary
field `'B'`) + GIN index to `pages`/`products`/`news_posts`/`services`,
queried via Supabase JS's `.textSearch()`. **Only `pages` and `products`
are actually wired into search/`sitemap.ts`** — see the Content gaps
section below for why `news_posts`/`services` are excluded. The header's
search field (`components/layout/mega-menu-client.tsx`) is a plain GET
`<form action="/search">`, no client JS needed.

**Metadata/OG/JSON-LD**: `lib/seo.ts` (`siteUrl()`, `absoluteUrl()`,
`resolveOgImage()` — page/product image wins, falls back to
`site_settings.default_og_image`) and `components/seo/json-ld.tsx`
(`<JsonLd data={...} />` plus `organizationJsonLd`/`productJsonLd`/
`breadcrumbJsonLd` builders) are shared by every route's
`generateMetadata`. Organization JSON-LD renders once in
`app/(site)/layout.tsx`; Product + BreadcrumbList render on product
detail; BreadcrumbList also renders on every `[...slug]` catch-all page
(built from the slug segments, not a stored breadcrumb — intermediate
segments get a title-cased label, the final segment uses the page's real
title). `/admin/*` and `/preview/*` are `robots: {index: false}` at
their layout level, not per-page.

**`app/sitemap.ts`/`app/robots.ts`** are the Next.js App Router file
convention (not routes under `(site)`) — their DB reads live in
`lib/data/sitemap.ts` per constraint 2, same as everywhere else.

**Legacy redirects** (`redirects` table, already seeded by migration
`0009`) resolve inside the `[...slug]` catch-all when no `pages` row
matches the slug — see `docs/DECISIONS.md` for why there (not
`next.config.ts`, not `proxy.ts`) and for the 301/308 vs. 302/307
mapping.

## Hardening (Phase 7)

**Contrast-aware accent colors.** `--color-osi-gold-700` and
`--color-osi-slate-200` (in `app/globals.css`, alongside gold-500/
slate-300) exist because the mockup's accent colors only pass WCAG AA on
one background each — gold-500/slate-300 on navy, gold-700/slate-200 on
cream. Any block rendering an accent color on an admin-configurable
`background` field branches on `data.background === "cream"` to pick the
right one (grep for `data.background === "cream"` to find every
instance). Adding a new block with gold/slate accent text on a
configurable background must do the same — check both variants against
`bg`, don't assume the default background is the only one it'll ever
render on.

**Focus.** `app/globals.css` sets a universal `:focus-visible { outline:
2px solid #0066ff; ... }` — deliberately not a brand color, since
neither gold nor navy clears 3:1 against both navy and cream
backgrounds simultaneously (see DECISIONS.md). Never add
`focus:outline-none` without a replacement that's actually visible on
that element's specific background.

**Error/loading/not-found.** `app/(site)/not-found.tsx` (on-brand,
inside the Header/Footer chrome) is what `notFound()` calls actually hit
for public routes; `app/not-found.tsx` is a bare-bones root fallback for
paths outside `(site)`. `app/(site)/error.tsx` and
`app/admin/(dashboard)/error.tsx` are segment error boundaries;
`app/global-error.tsx` only fires if the root layout itself throws and
must render its own `<html>/<body>` with inline styles (no Tailwind
tokens available at that point). `app/(site)/loading.tsx` is a generic
skeleton for every route under it; `products/[category]/[slug]/
loading.tsx` is tailored to that route specifically since it's one of
the two Lighthouse targets below.

**Lighthouse ≥ 90 (home + product detail)**: verified via `pnpm build
&& pnpm start` (not `next dev`) plus the `lighthouse` CLI — currently
100/9x/100/100 on both. If re-verifying: kill whatever's actually
listening on port 3000 with `lsof -ti:3000 | xargs kill -9`, not
`pkill -f "next start"` — the running process is named `next-server`,
not `next start`, and a stale server has silently answered "still
broken" more than once in this project's history. See DECISIONS.md.

**Alt text is enforced at the media library's upload chokepoint**
(`lib/actions/media.ts → uploadMediaAction`, server-side, not just the
form's `required` attribute) — see `docs/DECISIONS.md` for why
individual block image fields don't each get their own alt field on top
of that.

`docs/CLIENT-HANDBOOK.md` is the plain-language admin guide for OSI
staff — keep it in sync with any admin UI changes that alter a
documented workflow (adding/renaming an admin section, changing the
block editor's controls, etc.).

## Deployment

`git push origin main` on `github.com/FelipeRamirezQuattro/osi-cms`
(public repo — see DECISIONS.md for why not the client's private org
repo) auto-deploys to production via Vercel's git integration —
`deploy_to_vercel`'s per-call full-tree-replace approach stopped being
viable once the repo passed ~75 files. Live at
`https://osi-cms.vercel.app` (project `osi-cms`,
`prj_uKK9PZKsROFc9AdgSLQWfcIHnQoy`, team `jramirez-3311's projects`).
Production environment variables are set (Vercel dashboard or
`vercel env add <NAME> production --value <VALUE> --yes`, the account's
`vercel` CLI is already authenticated) — **Preview is not** (a Vercel
CLI bug blocked setting them non-interactively; see DECISIONS.md), so a
preview deployment (e.g. from a future PR) will fail the same
missing-Supabase-credentials way the first production build did, until
someone adds the same six vars to Preview via the dashboard.

## Known content gaps (see `docs/CONTENT-GAPS.md` for the full list)

No PDF/brochure/datasheet URLs exist anywhere in the legacy scrape;
only 7 of the mockup's 15 world-map countries have real distributor
contacts backing them; only 3 products (Gas Release System, ESP Chem
Screen, SRP Sand Lift) have real legacy copy — everything else in the
mega menu is name-only.
