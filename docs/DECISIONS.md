# Decisions

One line per non-obvious choice, with the reason. Newest at bottom.

- **Scaffolded on Next.js 16.3.4, not 15.x.** The master prompt asked for
  "15+"; 16 is current stable and satisfies that. Recorded the Next 16
  breaking changes that affect this project in `CLAUDE.md` (`proxy.ts`
  instead of `middleware.ts`, always-async request APIs, `revalidateTag`
  two-arg signature, `cacheComponents` left off).
- **`content/legacy/` in the repo was initially the wrong dataset**
  (Quattro's own agency content, copied by mistake) — replaced with the
  correct Odessa Separator scrape from
  `~/Documents/Work/Quattro/webscrapper/scrape_output_odessaseparator/`
  before Phase 0 work began. Confirmed by URL/title match against the
  master prompt's page list.
- **SG-SST Policies legacy page stays in Spanish** when migrated — it's
  Colombian workplace-safety/harassment regulatory content, not
  translatable UI copy, so the English-only constraint doesn't apply to
  it. Revisit if the client wants an English translation alongside.
- **Supabase project `osi-cms` created fresh** (region `us-east-1`, org
  "Freelancer", free tier) rather than reusing an existing project in the
  account — none of the existing projects (`website`, `Quattro website`,
  `quiz`, `clamp-tracker`) belong to this client.
- **Prettier added alongside ESLint** in Phase 0 (`prettier`,
  `eslint-config-prettier`, `prettier-plugin-tailwindcss`) since the
  master prompt's stack table calls for "ESLint/Prettier" explicitly.
- **Vercel project `osi-cms`** created fresh (team `jramirez-3311's
  projects`, project id `prj_uKK9PZKsROFc9AdgSLQWfcIHnQoy`) after the
  first attempt to create a new project hit a 403 — the "claude.ai
  Vercel" connector had been authorized with a restricted token scope.
  Reconnecting the connector fixed it. Did not reuse the pre-existing
  `osi-website` project in the same team — it has an unrelated live
  domain (`chatbot.qdevsolutions.com`) attached.
- **Supabase keys stored in `.env.local` use the new `sb_publishable_*`
  / `sb_secret_*` key format**, not the legacy JWT anon/service_role
  keys — both work interchangeably with `@supabase/ssr` and
  `supabase-js` 2.116+.
- **Added a `status` (draft/published) column to `services`, `industries`,
  `applications`, `locations`, and `directory_contacts`**, none of which
  were specced with one (master prompt §5.3/§5.5). The blanket RLS rule
  in §5.8 ("public SELECT only WHERE status='published'") only works if
  every content table has that column, and `directory_contacts` in
  particular holds real personal phone numbers/emails that need a way to
  stay unpublished until reviewed.
- **Split `is_staff()` and `is_admin()` RLS helpers.** Any active
  `admin_profiles` row passes `is_staff()` (full content CRUD); only
  `role='admin'` passes `is_admin()`, which gates inserting/updating/
  deleting other `admin_profiles` rows — matches open question #8
  ("editor can draft, cannot publish... admin role only" for inviting
  users). Both are intentionally callable by `anon`/`authenticated` (the
  Supabase advisor flags this) since RLS policies evaluate as the
  connecting role — revoking EXECUTE would break every policy that calls
  them.
- **`redirects` is publicly readable** (no status gate) rather than
  restricted to staff/service-role — it's just URL mappings, not
  sensitive, and public read lets the `[slug]` catch-all resolve
  redirects without a service-role client on every request.
- **Consolidated each table's "public read" + "staff manage" (for all)
  policies into one SELECT policy** (`status = 'published' OR
  public.is_staff()`) plus separate staff-only insert/update/delete
  policies, after the Supabase performance advisor flagged 22 tables
  evaluating two permissive policies per query.
- **Seeded only `product_categories` (4) and `industries` (9)** from the
  master prompt's explicit text (§5.1, §5.3) via
  `scripts/seed-taxonomy.ts`, run once against Supabase. `applications`
  and a possible 10th industry ("Gas Control", seen on the mockup's
  Industries tab but not in the prompt's text list) are intentionally
  left unseeded — logged in `docs/CONTENT-GAPS.md` pending client
  confirmation, per constraint 4 (never invent content).
- **Product detail pages render directly from `products` + child tables,
  not through `pages`/`page_blocks`.** A product's structure (benefits,
  stages, specs) is fixed and relational, not freeform CMS content — see
  the block registry note in `CLAUDE.md`. Home, `/products` (listing),
  and `/contact` do go through the generic block system.
- **`ESP Chem Screen`'s `product_categories` row is "pumps," not
  "chemical-treatment,"** even though About Us text frames it as a
  chemical-treatment tool — matches the mockup's own mega menu placement
  (page 4), which the master prompt treats as the higher-authority
  source (constraint 1). `chemical-treatment` has zero seeded products
  as a result; worth raising with the client.
- **`global_map` renders a static list of countries with published
  locations, not an interactive SVG map with hover cards.** Master
  prompt open question #3 (raised, not yet answered) asks which the
  client wants — swap in the real map once that's settled.
- **The home/products/contact pages seeded in Phase 3 are published
  directly**, not left `draft` like a real content migration would be
  (master prompt §8.7) — this is architecture-proof content for Phase 3,
  not the real client migration (that's Phase 4, and does land as draft
  for a human to review).
- **Two Next.js 16 requirements discovered while building Phase 3**,
  now documented in `CLAUDE.md`: (1) a `"use client"` file cannot also
  export the plain-object `defineBlock(...)` a server-side registry
  reads — non-component exports from a client module arrive as unusable
  references server-side. (2) any route reading Supabase content needs
  `export const dynamic = "force-dynamic"` (set once, in
  `app/(site)/layout.tsx`) or the build fails trying to statically
  prerender a page that touches `cookies()`.
- **Skipped the Vercel deploy for Phase 3.** `deploy_to_vercel` replaces
  the whole file tree per call (not incremental), and at ~75 files this
  session couldn't reliably assemble one complete call — five attempts
  each shipped a partial tree and would have failed to build. Phase 3 is
  verified instead via local `pnpm build`/`lint`/`tsc` (all clean) and
  screenshots of the running local dev server sent directly to the user.
  Revisit deployment via GitHub + Vercel's git integration before the
  file count grows further — manual deploys stop being practical past
  this size.
- **Added a generic `[...slug]` catch-all route** (`app/(site)/
  [...slug]/page.tsx`) instead of the master prompt §7 sitemap's
  single-segment `/[slug]`, so nested Phase 4 pages (`careers/hiring`,
  `hse/sg-sst-policies`, `services/machine-shop`, etc.) resolve without
  a dedicated route file each. Renders identically to home/products/
  contact — `getPageBySlug` + `BlockRenderer` — just with the joined
  segment array as the slug.
- **`osi-directory.json` is migrated by a separate, hand-curated script**
  (`scripts/migrate-directory.ts`), not the generic
  `scripts/migrate-legacy.ts` parser. The domestic-staff entries are
  uniform enough to parse programmatically, but the international
  distributor entries aren't (name+title concatenated with no separator,
  inconsistent field order, two fields joined on one line) — a generic
  regex parser risked misattributing a real person's phone number or
  email. Every value was transcribed directly from the source JSON.
- **The legacy scraper's `headings[]`/`paragraphs[]` arrays don't line
  up 1:1 with `raw_text` order** in the way `scripts/migrate-legacy.ts`
  first assumed — two bugs found and fixed while migrating machine-shop
  specifically (the most heading-fragmented page): (1) independently
  searching each heading's text in `raw_text` via `indexOf` lets a short
  heading ("MACHINE") match inside an earlier, unrelated heading that
  contains it as a substring ("MACHINE SHOP") — fixed with a two-pointer
  scan that advances a single shared cursor forward through `raw_text`
  monotonically. (2) `paragraphs[]` sometimes joins two DOM text nodes
  with no separator where `raw_text` still has them on two lines ("- RPA
  (Robotic Process Automation)" vs. "- RPA\n(Robotic Process
  Automation)") — fixed by matching on whitespace-stripped fingerprints
  instead of exact substrings, while still storing the original,
  well-formed text. See the function's comment in
  `scripts/migrate-legacy.ts` for the full explanation — reuse this
  pattern for any future legacy-scrape parsing.
- **Everything from Phase 4 landed as `draft`** exactly per master
  prompt §8.7 — verified rendering correctly by temporarily flipping a
  few pages to `published` for screenshots, then reverting them to
  `draft` before committing.
- **Admin block-editor forms are driven by a hand-written `FieldSpec[]`
  per block (`lib/blocks/admin-fields.ts`), not runtime introspection of
  the Zod schema.** The master prompt says "forms generated from the Zod
  schemas"; deep-unwrapping Zod v4 internals (ZodOptional/ZodDefault/
  ZodEnum/etc.) to synthesize a form is fragile across Zod versions and
  can't express UI-only intent a schema doesn't carry (which string
  field wants the media picker vs. a plain text input, which one is the
  Tiptap editor). Each block file now exports `adminFields` next to its
  schema and `defineBlock` call — validation still runs entirely through
  the Zod schema at render/save time (see `BlockRenderer`); `FieldSpec`
  is presentation metadata only. All 26 block types now carry this, and
  `pnpm build`/`eslint`/`tsc --noEmit` are clean.
- **Added a `media` Supabase Storage bucket** (migration
  `0015_media_storage_bucket.sql`, public read / staff-only write) for
  admin-uploaded images — the master prompt's "storage glue" exception to
  constraint 2. Legacy images are unaffected and keep resolving through
  `lib/media.ts`/`NEXT_PUBLIC_LEGACY_MEDIA_BASE`; this bucket is only ever
  written to going forward, from `/admin` via `lib/data/media.ts`.
- **The page editor's block-form fields are untyped
  (`react-hook-form`'s `Control<any>`)** in `field-renderer.tsx` and
  `page-editor.tsx` specifically — every other file in the codebase keeps
  strict types. Each block's `data` shape is a different Zod-derived
  object, so there's no single static type to give the form; the
  alternative (a giant discriminated union keyed by block type, re-derived
  by hand alongside `FieldSpec`) added real complexity for no safety this
  form doesn't already get from server-side re-validation against the
  real Zod schema in `saveDraftAction` before every write.
- **Live preview (`/preview/[...slug]`) is gated by `requireAdmin()`,
  not a signed token.** The master prompt implies a token-based mechanism
  (`/preview/[slug]?token=`); since the only consumer right now is the
  admin's own "Preview" button — always an authenticated staff session —
  a signed token adds nothing this session doesn't already have. Revisit
  if the client wants to share an unauthenticated draft link with an
  outside stakeholder.
- **Publish always writes a full `{ meta, blocks }` snapshot to
  `page_revisions`** (master prompt §5.1), and "Publish" in the UI first
  silently saves the current draft, then publishes — so publishing never
  ships stale content relative to what's on screen. Revision restore
  overwrites the current draft (via the same `savePageDraft` path), it
  does not itself publish.
