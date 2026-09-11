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
app/                    routes (styleguide done; real pages Phase 3+)
components/ui/          design-system primitives (Phase 1)
lib/db/client.ts         Supabase client factories — the only file that
                         imports @supabase/ssr's client constructors
lib/db/database.types.ts generated types (regenerate after schema changes
                         via the Supabase MCP generate_typescript_types
                         tool — don't hand-edit)
lib/data/                repositories, one file per entity — pages,
                         products, taxonomy, news, resources, locations,
                         navigation, settings so far
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

## Block registry (Phase 3+)

`lib/blocks/registry.ts` maps `type → { label, icon, schema, defaults,
Render, AdminFields, category }`. Adding a block = one file in
`components/blocks/` + one registry entry, nothing else. 26 block types
are specified in the master prompt (hero_full, product_grid, contact_form,
etc.) — see that spec, not reproduced here to avoid drift.

## Design tokens (Phase 1 builds these; noted here so nothing forgets them)

Orbitron (display, always uppercase, wide tracking) + Montserrat (body,
light weight, 1.7 line-height). Palette: navy `#001B33`/`#04243D`, cream
`#F2E9DE`, gold `#E2902A` (scarce, load-bearing accent only — never body
text). Six signature motifs to build as primitives before any page:
angled corner clips, circled-arrow buttons, hairline grid overlay,
label-plate cards (one "open" per grid), duotone photography, breakout
gold CTA bar. Full detail in the master prompt §4.

## Phase discipline

Work proceeds in the 8 phases from the master prompt (0 Foundation → 1
Design system → 2 Schema → 3 Blocks/public rendering → 4 Content
migration → 5 Admin CMS → 6 Forms/search/SEO → 7 Hardening). Plan each
phase briefly, get a go-ahead, then build. `pnpm build`, `pnpm lint`,
`pnpm exec tsc --noEmit` must be clean at the end of each phase.

## Known content gaps (see `docs/CONTENT-GAPS.md` for the full list)

No PDF/brochure/datasheet URLs exist anywhere in the legacy scrape;
only 7 of the mockup's 15 world-map countries have real distributor
contacts backing them; only 3 products (Gas Release System, ESP Chem
Screen, SRP Sand Lift) have real legacy copy — everything else in the
mega menu is name-only.
