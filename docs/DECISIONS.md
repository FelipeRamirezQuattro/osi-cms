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
- **Built one generic simple-entity admin (`[entity]/`) instead of 8
  hand-written CRUD screens** for industries, applications, services,
  news, resources, locations, directory, and redirects — they're all just
  flat columns with an optional `status`/`position`, described declaratively
  in `lib/admin/entity-config.ts` and rendered through the same
  `FieldRenderer` engine the block editor uses. Products got a bespoke
  editor instead (`/admin/products`) because of its child tables
  (benefits/stages/specs) and many-to-many relations
  (industries/applications) — still built on the same `FieldRenderer`,
  just with its own Server Actions (`lib/actions/products.ts`) instead of
  the generic entity ones, since saving a product means writing to five
  tables, not one.
- **`lib/data/admin-entities.ts`'s CRUD functions take `table: string`,
  not a `Database` key**, and lean on `any` at the Supabase-call boundary
  to do it — the alternative (a real generic `<T extends TableName>`
  signature) fights Supabase's overload resolution for marginal benefit,
  since every caller already re-validates through `EntityConfig.fields`
  at the UI layer. Confined to this one file, same reasoning as the `any`
  usage in `field-renderer.tsx`/`page-editor.tsx`.
- **Simple-entity/product saves do NOT re-validate with a full Zod schema**
  server-side, unlike block saves (`saveDraftAction`). These are flat
  columns with real Postgres `NOT NULL`/`check` constraints already
  enforcing the required shape (unlike a block's `data` jsonb, which has
  no DB-level shape constraint at all — Zod is the only thing keeping it
  render-safe) — a Postgres constraint violation surfaces as a plain error
  string in the form instead. Revisit if a specific entity's DB constraints
  turn out to be too loose to catch a bad save.
- **Found and fixed two real bugs only visible at runtime, not in
  `next build`/`tsc`/`eslint`**, via a Playwright pass reading the dev
  server's console: (1) `MediaPicker` rendered inline caused a hydration
  failure — every caller puts it inside its own `<form>`, and its own
  upload `<form>` made that a nested `<form>`, invalid HTML; fixed with
  `createPortal` to `document.body`. (2) `image`/`richtext` fields were
  wrapped in a `<label>` (copied from the plain-input fields), which made
  `MediaPicker`'s trigger button unreachable by accessibility role — fixed
  with a plain `<div>` wrapper (`FieldGroup`) for those two. Neither
  showed up in the type checker or the production build; both would have
  shipped silently without a driven browser pass.
- **Site search and `sitemap.ts` only cover `pages` and `products`**,
  not `news_posts`/`services` despite the master prompt naming all four
  (§9: "search over products/news/services/pages"). At the time this was
  decided, `/services/*` was already served by the `[...slug]` catch-all
  against real, Phase-4-migrated `pages` content (Fluid Levels, Pump
  Cards, Machine Shop) — since confirmed as the permanent decision (see
  below), so this scoping is correct as-is, not a placeholder: `pages`
  already covers Services, and `news_posts` genuinely has nothing to
  index.
- **Decided: Services stays CMS pages; the `services` table is
  intentionally unused going forward** (client decision, 2026-09-11 —
  see `docs/CONTENT-GAPS.md`). Removed `services` from the generic
  entity admin (`lib/admin/entity-config.ts`, and the `/admin/services`
  sidebar link) and deleted `listServices`/`getServiceBySlug` from
  `lib/data/taxonomy.ts` as dead code. `product_grid`'s "Services" tab
  now sources from real `pages` under `services/` (new
  `lib/data/pages.ts → listPagesUnderSlug`) instead of the empty table —
  the same fix that made Phase 6 search/sitemap scoping correct also
  needed to reach this one remaining reader of the `services` table. Left
  the `services` table itself in the schema (matches master prompt
  §5.3) rather than dropping it — no cost to leaving an unused table in
  place, and dropping one is the kind of irreversible action to avoid
  without being asked. News stays genuinely open (no legacy content to
  migrate, nothing broken by its absence) — revisit once there's real
  content to publish.
- **Full-text search indexes title/summary-level columns only, not the
  rich `body` jsonb (Tiptap) columns** on `pages`/`products` (migration
  `0016_search_vectors.sql`). Extracting plain text from arbitrary Tiptap
  JSON for a generated `tsvector` column needs a plpgsql function;
  title/tagline/summary matching covers the realistic "do you carry X"
  search-box use case without that complexity. Revisit if relevance
  turns out too shallow once there's real content to search.
- **The contact form's rate limit reads `form_submissions` via the
  service-role client, not the request-scoped anon client** — RLS only
  grants that table's SELECT to staff, so an anonymous visitor's own
  Server Action has no way to read back rows (not even ones matching
  their own `ip_hash`) through the normal cookie-authenticated client;
  it would silently see zero every time and the limit would never
  trigger. This is the one place outside `lib/db/client.ts`/`lib/auth`
  that reaches for the service-role client from application code, and
  it's confined to a single read used only for counting, not exposed.
- **Legacy redirects resolve through `next/navigation`'s `redirect()`/
  `permanentRedirect()` inside the `[...slug]` catch-all**, checked only
  when no `pages` row matches — not `next.config.ts`'s static
  `redirects()` (which can't read from the DB) and not `proxy.ts` (which
  would add a DB round-trip to every single request, not just 404s).
  This only distinguishes permanent (308) vs. temporary (307), not the
  full 301/302/307/308 range `redirects.status_code` stores — 301 and
  308 both map to `permanentRedirect()`, everything else to `redirect()`.
  301 vs. 308 is a real difference (308 preserves request method) but
  not one that matters for the legacy map's GET-only links.
- **Switched deployment from manual `deploy_to_vercel` to GitHub + Vercel
  git integration** (2026-09-11) — the file-tree-replace-per-call
  limitation flagged back in Phase 3 (broke past ~75 files) was never
  going to hold at the repo's current size (188 tracked files). Repo:
  `github.com/FelipeRamirezQuattro/osi-cms` (public — a first attempt
  under the client's `Odessa-Separator` org hit a real Vercel Hobby-plan
  restriction: private repos owned by a GitHub Organization aren't
  linkable below Pro. No secrets are in the repo — `.env.local` is
  gitignored — so publicness costs nothing beyond source visibility).
  Linked to the same Vercel project used since Phase 1
  (`prj_uKK9PZKsROFc9AdgSLQWfcIHnQoy`, `osi-cms`), which had no
  environment variables configured at all — the first git-triggered
  build failed on exactly that (`Your project's URL and Key are
  required to create a Supabase client!`, surfaced at
  `/sitemap.xml`'s prerender, not a code bug). Set via the Vercel CLI
  (`vercel env add ... --value ... production`, the MCP toolset has no
  env-var-write tool) for **Production only** — `preview` env vars hit a
  Vercel CLI bug where `env add <name> preview --yes` still returns an
  `action_required: git_branch_required` response even with `--yes`/
  `--non-interactive`, suggesting the identical command as its own fix.
  Didn't chase it further since it doesn't block production; preview
  deployments (e.g. from a future PR) will fail the same way production
  did until someone adds those six vars to Preview too, via the
  dashboard or CLI. `IP_HASH_SALT` got a fresh random value for
  production (`openssl rand -hex 32`), not the repo's
  `dev-only-salt-change-in-production` placeholder. `NEXT_PUBLIC_SITE_URL`
  is set to `https://osi-cms.vercel.app`, not a custom domain — none
  exists yet (master prompt open question #1, unanswered). A stray empty
  `felipepoli/osi-cms` GitHub repo (created once before the org-repo
  Hobby-plan restriction surfaced, then not needed) is still sitting on
  GitHub — the `gh` token here lacks the `delete_repo` scope to remove
  it; harmless, but worth deleting manually via GitHub's UI at some
  point.
- **Added a forgot/reset-password flow** (`/admin/forgot-password`,
  `/admin/reset-password`) that Phase 5 never built — surfaced by a real
  operational problem, not planned ahead of time: the first admin
  invite link expired before use. Supabase's recovery link puts the
  session in the URL hash fragment, which the server never sees, so the
  reset page has to establish it client-side. That component can't
  import `lib/db/client.ts` for a browser client the way everything else
  does — that file also pulls in `next/headers` (for
  `createServerDbClient`) at module scope, and Next.js bundles the
  whole module for any importer, which breaks the client build. Added a
  second, client-only Supabase-client constructor in `lib/auth/client.ts`
  specifically for this, rather than trying to split `lib/db/client.ts`
  itself — the smaller, more contained deviation from "one client-
  constructor file."
- **Added `--color-osi-gold-700` and `--color-osi-slate-200` design
  tokens** (Phase 7 hardening) — the mockup's gold-500/slate-300 accent
  colors only pass WCAG AA contrast on navy backgrounds (gold-500 on
  cream-100 is 2.12:1; slate-300 on navy-900 is 3.07:1, confirmed by a
  real Lighthouse failure, not a guess). gold-700/slate-200 are the same
  hues, darkened/lightened respectively until they clear 4.5:1 against
  the *other* background. Every block that renders one of these accent
  colors now branches on `data.background === "cream"` to pick the
  right variant (`hero-full`, `product-hero`, `stat-grid`,
  `stages-carousel-client`, `split-feature`, `global-map`,
  `contact-details`) — same pattern the codebase already used for
  `mission-cards`' button variant. Fixed contexts (search page, admin
  dashboard cards, styleguide, not-found/error pages) just use whichever
  variant matches their one fixed background. `label-plate-card.tsx`'s
  cream-background usage of slate-300 was independently verified
  correct and left alone — not every slate-300 usage was wrong, only
  the ones on navy.
- **Verified Lighthouse/axe scores against a genuinely fresh `next
  start` process, not `next dev`** — and burned real time on a false
  lead when `pkill -f "next start"` silently failed to match the actual
  running process (`next-server`, not `next start`), leaving a stale
  build answering requests through two full rebuild-and-retest cycles.
  `lsof -ti:3000 | xargs kill -9` (kill whatever actually holds the
  port, not a name guess) is what actually works — worth remembering
  before trusting any "it still fails after I fixed it" result against
  a long-running dev/prod server in this environment.
- **A universal `:focus-visible` outline uses an off-brand blue
  (`#0066ff`), not gold or navy** — neither brand color clears 3:1 (the
  non-text contrast floor) against both the navy and cream backgrounds a
  focus ring needs to work on simultaneously; gold-500 is only 2.12:1 on
  cream, navy-900 is invisible on navy. A blue reads as "system focus,"
  not a brand color, which is arguably the right signal anyway.
- **`LabelPlateCard`'s outer `role="button"`/`tabIndex`/`aria-expanded`
  are dropped entirely once a card is open** (was: always present). Open
  state renders a real `<Link>` ("Learn more") inside the same div that
  carried `role="button"` — nesting a native interactive element inside
  an ARIA-button container is a WCAG 4.1.2 violation (confirmed via
  axe-core, not just inspection). `aria-expanded` doesn't move to
  another element either, since nothing else acts as this disclosure's
  toggle once it's open — it's just dropped, which axe also requires
  (the attribute isn't valid without an accompanying interactive role).
- **The media library's alt-text field is required, not optional**
  (master prompt §9 Phase 7: "alt text enforced in admin") — enforced
  server-side in `uploadMediaAction`, not just the form's `required`
  attribute. This is the one chokepoint every image passes through;
  per-block image fields (hero images, diagrams, etc.) don't each carry
  their own alt field — where a block already has adjacent text that
  doubles as a natural caption (a product name, a stage title), that
  text is reused as the image's alt attribute instead of adding a new
  admin field for every image-carrying block.
- **Publish always writes a full `{ meta, blocks }` snapshot to
  `page_revisions`** (master prompt §5.1), and "Publish" in the UI first
  silently saves the current draft, then publishes — so publishing never
  ships stale content relative to what's on screen. Revision restore
  overwrites the current draft (via the same `savePageDraft` path), it
  does not itself publish.
- **Removed the `"image"` background option instead of building it out**
  (Task 7 audit remediation). `components/ui/section.tsx` already
  rendered it identically to `"transparent"` — a fully dead option, not
  a partially-built one — and a real configurable-background-image
  system (overlay, focal point, accessible decorative semantics) is
  disproportionate scope for a dead-field fix, plus a step away from
  this project's documented navy/cream/gold design system toward
  generic photo backgrounds. A read-only preflight against `page_blocks`
  confirmed zero live rows used it, so no data-fixup migration was
  needed either.
- **Removed the unused `"primary"` nav menu** (Task 7) rather than
  wiring it into the public header — utility + mega are the established
  header model (confirmed: `scripts/seed-navigation.ts` only ever seeds
  those two; nothing queries or renders `"primary"`). The `nav_menus.key`
  check constraint still technically permits the value going forward;
  narrowing it would need a constraint rebuild for no real benefit now
  that the admin UI simply never offers it as a choice.
- **Page `template` is a one-time creation preset, not a runtime
  switch** (Task 7) — the column stays (it's now an honest historical
  record of which starter blocks a page got at creation), but nothing
  on the public rendering path branches on it, and `"product"` was
  dropped from the option enum entirely: real products live in their
  own `products` table/route, never in `pages`/`page_blocks`, so
  offering it there was actively misleading.
- **Announcement bar dismissal is keyed off a hash of the message
  text**, not a fixed localStorage key or an admin-managed version
  number (Task 7). Changing the announcement's copy in the admin
  therefore makes it reappear for everyone who already dismissed the
  old one — publishing new copy is a new announcement as far as a
  viewer's dismissal history goes, without needing staff to remember to
  bump a version field.
- **The `[...slug]` soft-404 is fixed with a proxy-level rewrite to a
  `loading.tsx`-free sibling route group** (`app/(site-404)/`), not a
  hand-rolled standalone HTML response (Task 8, revised after review).
  Root cause: `app/(site)/loading.tsx` gives every route under `(site)`
  an ambient Suspense boundary; the moment `[...slug]/page.tsx`'s async
  body suspends on its DB call, that boundary's fallback commits the
  response as `200` before `notFound()` ever runs, and the status can
  never change afterward (Next's docs are explicit that a real status
  requires checking existence *before* the response streams — the fix
  is a proxy-level check, but WITHOUT Cache Components, "before it
  streams" is achievable without giving up chrome). `proxy.ts`'s
  `publicSlugIsResolvable()` check runs first; on a confirmed miss it
  `NextResponse.rewrite()`s to `app/(site-404)/system-not-found`, a
  route group with the exact same Header/Footer chrome (reused from
  `(site)/layout.tsx` via a named export, not duplicated) but
  deliberately **no** `loading.tsx` anywhere in its tree — with no
  Suspense boundary to commit an early `200`, `system-not-found`'s
  unconditional `notFound()` call is the first thing that can settle the
  response, and it settles it as a real `404`.
  **Non-obvious trade-off, found by testing a real `next build && next
  start` server, not just reading the docs**: with zero Suspense
  boundaries anywhere in a route's tree, Next's own `notFound()`
  machinery (`HTTPAccessFallbackBoundary`) has no boundary to perform a
  server-side content swap into, so the *raw* HTTP response body is a
  minimal `id="__next_error__"` shell — confirmed even on a maximally
  trivial synthetic route with no DB calls at all, so it isn't specific
  to this route's own async work. The actual Header/Footer/"Page not
  found" content ships as an RSC payload the browser hydrates
  client-side; confirmed with Playwright against the same built server
  that every real visitor still sees the correct chrome (status 404,
  header/footer/heading all visible). This revises an earlier assumption
  in this codebase (a comment in `tests/e2e/public-routes.spec.ts`,
  since corrected) that an equivalent "switched to client rendering"
  message was a `next dev`/Turbopack-only quirk — it is not; it's
  intrinsic to `notFound()` with no viable Suspense-streaming boundary,
  in production builds too.
  **Also found by testing, not by reasoning**: `app/(site)/not-found.tsx`
  intentionally sets no `title` override in its `metadata` export (the
  root layout's bare default, "Odessa Separator Inc.", applies
  instead) — a templated title like "Page not found | Odessa Separator
  Inc." reads as a *resolved* page to
  `tests/e2e/navigation-links.spec.ts`'s broken-link detector, which
  specifically keys off the untemplated bare-default title as its "this
  didn't resolve to anything" signal (see that file's own header
  comment for why). A real e2e run against live data caught this
  silently masking two still-broken nav links (`/esp-packages`,
  `/what-we-do`) before the fix landed.
  `publicSlugIsResolvable()` itself fails **open** (returns `true`, i.e.
  renders normally) on any Supabase error result or thrown exception —
  a transient DB hiccup must never hard-404 a real page or 500 the whole
  site; the worst case of failing open is the pre-existing soft-404 for
  a genuinely missing slug during that same degraded window. It's also
  deliberately not cookie-bound (unlike `guardAdminRequest`'s client in
  the same file) — `page_publications`/`redirects` are both fully public
  (`using (true)`), and binding a visitor's session cookies here with a
  no-op `setAll` risked silently discarding an admin's rotated refresh
  token mid-browse. Scoped to exactly the generic catch-all (a hand-
  maintained `SKIPPED_TOP_SEGMENTS` list, enforced by a test that reads
  the real `app/(site)/` directory listing) — product/news/industry/
  application detail pages have the same theoretical soft-404 exposure
  but are pre-existing and out of this fix's explicit scope.
- **No divider/spacer block added** (Task 9, CMS remediation plan). With
  the new `columns` block landing in the same task and every block
  already carrying its own configurable `spacingTop`/`spacingBottom`
  (`blockCommonSchema`), a dedicated divider/spacer block would just
  duplicate spacing control that already exists per-block, and would
  mainly invite inconsistent visual hacks (arbitrary-height blank bands,
  ad hoc rule styling) rather than solve a real gap — confirmed absent
  from the registry both before and after this task.
- **No hosted video support added to the media library** (Task 11, CMS
  remediation plan). The brief gates it behind "only after defining
  file-size, bandwidth, and provider limits" — nobody has defined those
  (max upload size against Supabase Storage's own limits, whether
  Vercel's bandwidth/edge-caching story is even suitable for serving
  video, whether a real provider like Mux/Cloudflare Stream should be
  used instead of raw Storage objects). Building upload support ahead of
  that decision would lock in a shape (plain Storage object, like images)
  that's likely wrong once those limits actually get defined. `lib/blocks/
  admin-fields.ts`'s `FieldSpec` union does reserve `accept: "video"` at
  the type level (so a future field can declare the requirement), but
  nothing implements it — `MediaBrowser`/`MediaPicker` only handle
  `"image"` and `"file"` (PDF) today. External video stays embed-only via
  the existing `embed`/`video_embed` blocks, unchanged by this task.
- **Media asset "documents" means PDF only, for now** (Task 11). The one
  real document use case in this codebase is `resources.file_url`
  (brochures/datasheets, admin-entered as a plain URL — see
  `lib/admin/entity-config.ts`), and CLAUDE.md's content-gaps note says no
  legacy PDF/brochure/datasheet URLs exist anywhere in the scrape, so
  there's no back-compat surface pushing a wider allowlist. Widening
  `ALLOWED_DOCUMENT_MIME_TYPES`/`ALLOWED_DOCUMENT_EXTENSIONS`
  (`lib/validation/media.ts`) is a one-line change if a real second
  document type shows up. SVG was deliberately left off the *image*
  allowlist for the same upload path — an uploaded SVG can carry a
  `<script>`, and nothing here sanitizes SVG markup before serving it
  back as `image/svg+xml`.
- **The media library's usage search is a live scan, not a maintained
  tracking table** (Task 11, controller ruling #3). `findMediaAssetUsages`
  (`lib/data/media.ts`) fetches every `page_blocks` row and checks its
  jsonb `data` for the URL via `JSON.stringify(...).includes(url)`,
  because the URL can live under any key depending on block type — there's
  no single column path to filter on server-side, and PostgREST has no
  generic "find this string anywhere in this jsonb column" filter that
  would work across ~30 differently-shaped block schemas. Direct columns
  (`products.hero_image_url`/`diagram_image_url`, `product_stages.image_url`,
  `news_posts.cover_image_url`, `directory_contacts.photo_url`,
  `resources.thumbnail_url`, `pages.og_image_url`,
  `site_settings.default_og_image`) are checked with a plain `eq`. This is
  an MVP-scale search appropriate to the current handful of pages/blocks,
  not an indexed usage-tracking table kept in sync on every write —
  revisit if the page/block count grows enough to make the full-table scan
  slow.
- **Reusable sections have no revision history/restore** (Task 10, CMS
  remediation plan). Pages' `page_revisions` + restore exists because a
  page's blocks *are* the whole page; a shared section is a small
  reusable fragment referenced by key, and the task's acceptance
  criterion ("updating a published shared section updates all references
  only through its explicit Publish action") doesn't need a revision
  browser to satisfy. Everything else about the draft/publish model
  (`shared_sections`/`shared_section_blocks` draft tables,
  `shared_section_publications` snapshot table, atomic
  save/publish/unpublish/delete RPCs gated by `has_capability(...)`,
  `record_audit(...)` on every mutation) mirrors pages' 0017 model
  exactly. Add revisions later the same way if editors ask for undo.
- **A shared section's `key` is immutable after creation** (Task 10). Set
  once via `createSharedSectionAction`; `save_shared_section_draft_atomic`
  only ever updates `title`/blocks. Every `shared_section` reference block
  on any page stores that key, and — unlike a page's slug — there's no
  `redirects`-style mechanism for a stale shared-section reference, so
  letting it drift would silently break every page pointing at it.
- **`form_definitions` uses the plain content-table status pattern, not a
  second atomic draft/publish system** (Task 10). Unlike pages, a form
  has no SEO/preview surface that would leak from an in-place edit before
  a deliberate "publish" moment — the risk the pages/shared-sections
  atomic model exists to close. `saveFormDefinitionAction` still requires
  the `publish` capability for any draft↔published transition via the
  existing `requirePublishCapabilityForStatusChange` (same helper
  products/entities use), so an editor still can't be the one who makes a
  new form live.
- **`contact_form` was left as its own hardcoded block**, not
  re-expressed as a `form_definitions` row (Task 10 controller ruling #6
  explicitly left this as an implementer's choice). Rewriting it onto the
  generic engine risked changing the live contact form's admin fields or
  public behavior for no functional gain — the ruling only required a
  *working compatibility preset*, which the untouched block already is.
  `lib/actions/submit-contact-form.ts` now calls the same shared
  honeypot/rate-limit/insert/notify pipeline
  (`lib/actions/form-submission-pipeline.ts`) the generic engine's
  `submitFormAction` uses, so the two don't duplicate that logic even
  though they stay separate at the block/schema level.
- **No submissions export/retention feature was built** (Task 10). The
  task list's "and export/retention decisions" bullet is noted here as a
  flagged gap, not resolved: `form_submissions` still has no CSV export
  and no retention/deletion policy (the existing `admins delete
  form_submissions` RLS policy from Task 4 is defense-in-depth against a
  direct API call, not a feature backed by any admin UI action). No
  controller ruling for this task called for building one, and the
  existing `SubmissionsInbox` (`app/admin/(dashboard)/submissions/
  submissions-inbox.tsx`) already works unmodified for every form key —
  it renders `form_key` and the full jsonb `payload` generically, so it
  needed no changes to support the new generic engine's submissions
  alongside the contact form's.
- **`form_definitions` carries no schema version, and `form_submissions`
  records no version reference** (Task 10, flagged in review — noted
  here, not resolved). Editing a form's `fields` after it already has
  live submissions means old submissions are only interpretable through
  the field set in effect at read time, not the one in effect when they
  were submitted (a renamed/removed field silently loses its label in the
  inbox view; a changed `select`'s options don't invalidate an old
  answer that's no longer a valid option). Deferred rather than built now:
  real versioning needs either a schema snapshot per submission or a
  version column bumped on every field-shape change plus a migration path
  for the inbox UI to render historical shapes — disproportionate scope
  under the current time budget for what is, today, a low-traffic admin
  edge case (a form's fields rarely change once submissions exist).
  Revisit if a form with meaningful submission volume needs its fields
  edited.
- **No standalone `Pagination` primitive was built (Task 12).** The task
  brief listed one among the "as time allows" primitives, but none of the
  seven admin list screens consolidated onto `AdminDataTable` actually
  paginate today (`MediaBrowser`'s Prev/Next, the only paginated admin UI,
  is its own Task 11 component with server-driven offset state that
  doesn't map onto a generic reusable control without a real second
  caller to design against). Building a presentational-only pagination
  component with no caller — and per this plan's own testing bar, no real
  caller to write a meaningful behavior test against either — was
  deprioritized under the time budget in favor of the ConfirmDialog
  accessibility fix and the table/editor-shell consolidation the
  acceptance criterion actually requires. Revisit when an admin list grows
  large enough to need paging.
- **`AdminDataTable` gained a `variant="plain"` mode for the dashboard's
  "recently edited pages" table (Task 12).** That table never had the
  bordered-box/cream-header look every other admin list uses — consolidating
  it onto the same shared component while preserving its existing, simpler
  look (thin bottom-border header, no wrapping box) avoided an unrequested
  visual change to a screen the task's acceptance criterion didn't ask to
  redesign.
- **Verified, not just assumed, that Task 11 already fixed the "render-time
  setState in the standalone media library" item on the Task 12 brief
  (`app/admin/(dashboard)/media/media-library.tsx` and
  `components/admin/media/media-browser.tsx`).** Every `setState` call in
  both files runs inside an event handler, a `useEffect`, a
  `useTransition` callback, or `useActionState`'s reducer — none during
  the render pass itself. No fix was needed; this is recorded so the
  brief's bullet isn't mistaken for still-open in a future pass.
- **The admin block palette's "thumbnail" is a lettered category swatch,
  not a real image (Task 13a controller ruling).** There is no
  thumbnail/icon asset system anywhere in the block registry
  (`BlockDefinition` has no such field), and inventing preview images for
  26 blocks with no design assets to draw from would violate constraint 4
  ("never invent client content") in spirit even though blocks aren't
  client copy. `components/admin/block-palette-picker.tsx` instead pairs
  each block with a small navy swatch lettered by its existing `category`
  (H/C/$/M/F/L) and reuses the `description` field verbatim — every
  block's description already ends with a "— use for ..." clause (added
  for exactly this purpose, see Task 9), which doubles as the "common
  use" text the brief asked for with no schema change needed. No new icon
  library was added — `package.json` had no `lucide-react` or similar
  before this task, and a 6-way lettered swatch didn't need one.
- **Admin list search/filter/sort/pagination runs entirely client-side
  over an already-fetched array, not a server-side range query (Task
  13a).** `lib/admin/list-query.ts` (pure filter/sort/paginate helpers) +
  `components/admin/ui/use-list-query-state.ts` (the `useSearchParams`/
  `router.replace` URL binding) + `components/admin/ui/admin-list-
  controls.tsx` (the shared toolbar UI) are used by all three admin list
  screens (Pages, Products, the generic `[entity]` list). This matches
  the Task 12 decision to skip a `Pagination` primitive for the same
  reason: every admin table today runs tens of rows, not thousands, so
  a real `.range()` query is disproportionate scope. `AdminDataTable`
  gained an optional `toolbar` slot (rendered above the table, inside the
  same panel) rather than becoming a Client Component itself — it's
  still used directly from Server Components (the dashboard, the audit
  log) whose `columns` arrays hold non-serializable render functions,
  which a "use client" `AdminDataTable` could never legally receive as
  props across the server/client boundary.
- **`AdminDataTable`'s default `overflow` flipped from `"hidden"` to
  `"auto"` (Task 13a).** Every panel-variant table now scrolls
  horizontally on a narrow viewport by default instead of silently
  clipping columns — the opt-in-only `overflow="auto"` (previously only
  the audit log used it) meant every other admin list actually failed
  the "horizontal table scrolling" acceptance bullet by default. Passing
  `overflow="hidden"` explicitly still works for a caller that needs it.
- **Reordering (`ReorderButtons`, up/down) is disabled whenever a search/
  status/sort filter is active on Products or a `hasPosition` `[entity]`
  list (Task 13a)**, rather than trying to make "move up" operate
  correctly against a sorted/filtered view. These tables' manual
  drag-free reordering is a swap against the row's real, stored
  `position` column; once the visible order no longer matches that
  column's order (a name sort, a status filter), a directional swap
  button would move a row relative to a neighbor the editor cannot even
  see, which is worse than turning it off with a "clear filters to
  reorder" tooltip until the list is back in its default view.
- **The dashboard's "drafts awaiting publication" count is itemized per
  content type (pages/products/shared sections/forms), summed into one
  headline number (Task 13a).** `lib/data/dashboard.ts`'s
  `countDraftsAwaitingPublication` returns both; the dashboard shows the
  total as the stat tile and the per-type breakdown as a caption line
  underneath, so "12 drafts" always answers the obvious follow-up
  ("drafts of what?") without a second click.
- **The broken-link scanner (`lib/data/link-audit.ts`) is an on-demand,
  MVP-scale scan, not a persisted/maintained index (Task 13a) — same
  precedent as `findMediaAssetUsages`'s `JSON.stringify(...).includes(...)`
  scan (Task 11, documented above).** It regex-extracts every JSON string
  value shaped like a site-relative path out of `page_blocks.data` and
  `shared_section_blocks.data`, then checks each against a known-path set
  built from existing `lib/data/*` repository functions
  (`listAllPages`/`listAllProducts`/`listProductCategories`/
  `listEntityRows` for industries/applications/news_posts/redirects) —
  deliberately not new raw queries. The known-path set includes every
  status (draft included): a link to a not-yet-published page/product is
  not "broken" from an editor's point of view, since it resolves via
  preview and will resolve publicly the moment it's published. This is
  a separate function from `lib/auth/index.ts`'s `publicSlugIsResolvable`
  rather than an extension of it — that function is deliberately scoped
  to exactly what `proxy.ts`'s soft-404 fix needs (pages/redirects only;
  Task 8's own comment calls product/news/industry/application detail
  pages "out of its explicit scope" for that specific fix), and folding a
  second, unrelated purpose (an admin content-quality scanner) into a
  request-path security/404 helper would blur that boundary for no
  benefit — the two now happen to overlap in what they check, but for
  different reasons and at different trust boundaries (one runs on every
  public request pre-auth, the other only for an authenticated staff
  dashboard read). Same substring-match caveat `findMediaAssetUsages`
  already accepted applies here too (a path could theoretically collide)
  — acceptable at this content volume, not re-litigated.
- **The admin sidebar's information architecture, breadcrumbs, and
  responsive drawer live in `lib/admin/nav-config.ts` +
  `components/admin/admin-shell.tsx` (Task 13a)**, replacing the single
  flat `NAV_ITEMS` array `app/admin/(dashboard)/layout.tsx` previously
  hand-rolled inline. Verified (not just assumed) that Task 4's
  capability-based nav filtering already correctly covered every current
  section, including the newer Forms/Shared sections/Media entries added
  since — no gap was found there, so this task only added grouping,
  active-section highlighting, the mobile drawer, and breadcrumbs on top
  of the existing filter. Breadcrumbs are derived from the URL path plus
  the nav config's own labels (`Admin / <Section> / New|Edit`) rather
  than a stored per-row title, since a breadcrumb has no cheap way to
  know a specific row's real name without an extra data fetch the
  editor's own on-screen heading already provides a click away.
- **An editor's "Cancel" control on the generic entity/product/form
  editors is the same link as "back to the list" (`FormCard`'s new
  `backHref`/`backLabel` props, Task 13a), not a second, separate
  button.** None of these editors autosave, so navigating away without
  submitting already discards any unsaved edits — the same reasoning
  `page-editor.tsx`'s `AdminPageHeader` back link already relied on
  before this task touched anything.
- **Scroll-to-invalid-block targets a specific field by name where
  possible, falling back to the block's header toggle (Task 13b).**
  `lib/validation/blocks.ts`'s `validateBlockList` already returned a
  dotted Zod issue path as `field` (e.g. `benefits.0.title`) — exactly
  the same path `FieldRenderer` composes into a bare `name` attribute as
  `${namePrefix}.${spec.key}` (`namePrefix` being `blocks.<index>.data`).
  `lib/admin/block-editor-helpers.ts`'s `resolveBlockFocusTarget` turns
  that into a real `querySelector('[name="..."]')` lookup, scoped to a
  `[data-block-fields]` wrapper added around the open block's field panel
  in both `page-editor.tsx` and `shared-section-editor.tsx`. This reaches
  every `text`/`textarea`/`number`/`select` field (registered via bare
  `register(name)`) but **not** `image`/`richtext`/`object`/`array` —
  those are `Controller`-driven widgets with no bare `name` attribute to
  match (see CLAUDE.md's field-renderer.tsx notes). For those, and for a
  failure with no `field` at all (e.g. "Unknown block type"), the
  fallback chain is: first focusable control anywhere in the (now open)
  field panel, then the block row's own `[data-block-toggle]` header
  button. Real per-field targeting was judged worth the effort for the
  common case (most fields in most blocks are exactly those four
  `FieldRenderer` cases) rather than defaulting straight to the
  block-level fallback everywhere.
- **Blocks are opened via a controlled `Set<field id>` (not each row's own
  local `useState`) so a validation failure can force one open (Task
  13b).** Keyed by react-hook-form's own stable field-array id, not array
  index — index shifts on every drag/keyboard reorder, duplicate, or
  remove, but the id doesn't, so an already-open row stays matched to the
  right block through all of them.
- **Duplicate-near-source inserts via react-hook-form's `insert(index + 1,
  ...)`, and builds the duplicate's `{type, is_visible, data}` explicitly
  rather than spreading the source `useFieldArray` field object (Task
  13b)** — the field object also carries react-hook-form's own internal
  `id` key (used for React keys / dnd-kit sortable ids), which gets
  overwritten by react-hook-form's own id-generation either way when it
  next computes `fields`, but there's no reason to let it ride along into
  the newly stored block value at all. `lib/admin/block-editor-helpers.ts`'s
  `cloneBlockForDuplicate` deep-clones `data` specifically (not a shallow
  `{...block}`) so editing the duplicate's nested array/object fields
  can't mutate the source block — real, unit-tested behavior, not just
  "it renders."
- **Keyboard block reordering is dnd-kit's `KeyboardSensor` +
  `sortableKeyboardCoordinates` (Task 13b), plus explicit Move Up/Down
  buttons reusing `ReorderButtons`' presentational shell wired directly to
  `useFieldArray`'s `move(index, index ± 1)`** — not the RPC-swap
  `ReorderButtons` wiring Task 13a built for the products/entities lists
  (`lib/data/admin-entities.ts`'s position-swap RPC), which operates on a
  stored `position` column blocks don't have. Blocks reorder purely
  in-memory via `move()`, same as a drag, persisted only on the next
  Save/autosave — see `page-editor.tsx`'s `SortableBlockRow`.
- **Autosave's "only when the form currently passes client-side
  validation" gate is "don't retry the exact same content that already
  failed," not a predictive pre-check (Task 13b).** There is no real
  client-side schema to check against here: `getBlockPalette()`
  deliberately never ships a block's Zod `schema` to the client (a
  `ZodType` isn't serializable across the Server/Client boundary — see
  CLAUDE.md's Phase 5 section), so only the server's `saveDraftAction` /
  `validateBlockList` can actually validate a block's `data`. Autosave
  still calls that exact same action (never a second/parallel save path)
  — `lib/admin/block-editor-helpers.ts`'s `decideAutosave` just stops it
  from re-firing the identical failing content on every debounce tick
  while the editor is looking at, but hasn't yet fixed, a broken field.
  The moment the content changes at all, autosave is free to try again.
- **The autosave status indicator ("Saving…"/"Saved"/"Unsaved changes")
  is fully derived at render time from `isAutosaving`/`isDirty`/
  `autosaveOutcome`, with no effect syncing them together (Task 13b).**
  An earlier version used a `useEffect` to flip a stored "dirty" status
  whenever `isDirty` became true, and a ref (`lastFailedAutosaveValueRef`)
  for the "don't retry a known failure" gate read directly during render
  — both tripped this codebase's stricter React Compiler-era ESLint rules
  (`react-hooks/set-state-in-effect`: no synchronous `setState` inside an
  effect body; `react-hooks/refs`: no ref `.current` access reachable from
  a closure built during render, which — surprisingly broadly — includes
  anything nested inside `handleSubmit(...)`'s callback even though
  react-hook-form only ever *invokes* that callback later, from a real
  event handler). The fix was architectural, not suppression: the
  "last failed value" gate became real `useState` (legitimate to read
  during render), and the display status is now `isAutosaving ? "saving"
  : isDirty ? "dirty" : autosaveOutcome` computed inline — no effect
  needed to keep it in sync at all. The scroll-to-invalid-block target
  (above) hit the identical ref-in-render-reachable-closure problem for
  the same reason and got the same fix: plain `useState` holding a fresh
  `{index, field}` object per validation failure, with no need to reset
  it back to `null` afterward, since the effect's dependency comparison
  (`Object.is` on that object) only ever re-fires on a genuinely new
  object — never on unrelated re-renders, and correctly still re-fires
  even for a byte-for-byte repeat failure, since `revealValidationTarget`
  always constructs a new object.
- **The unsaved-changes guard covers `beforeunload` (tab close/refresh)
  and this page's own back link, not arbitrary in-app navigation (Task
  13b).** Next.js 16's App Router has no global "block navigation" hook
  the way the old Pages Router's route-change events did. Intercepting
  clicks on links elsewhere in the app (the sidebar, a breadcrumb, another
  page entirely) would require patching `next/navigation`'s router or
  History API internals — judged too fragile for this task given how
  central those modules are to every route transition in the app. Scope
  was deliberately limited to what `page-editor.tsx`/
  `shared-section-editor.tsx` themselves render: `AdminPageHeader` gained
  an optional `onBackClick` interceptor (only these two editors pass one;
  every other caller keeps plain-navigation behavior), and the Preview
  link's own click handler warns separately when dirty (see below). A
  user leaving via the sidebar mid-edit still loses unsaved work
  silently — a known, documented gap, not a claimed fix.
- **The Preview link warns via the existing `ConfirmDialog` (ported from
  Task 12) rather than an ambient inline note, and opens via
  `window.open()` on confirm instead of letting the anchor navigate
  natively (Task 13b).** The preview route itself
  (`app/(site)/preview/[...slug]/page.tsx`) already banners "reflects the
  last saved draft, not unsaved edits" — this closes the remaining gap
  one step upstream, at the moment the editor is about to click into a
  preview that silently won't show their just-typed edits. The trade-off:
  intercepting the click when dirty means a modifier-click (open in new
  tab, etc.) on the anchor is lost in that specific case, in exchange for
  an explicit, hard-to-miss warning at the moment it matters; when the
  form isn't dirty, the anchor's native `target="_blank"` behavior is
  untouched.
- **Shared sections get the identical block-editor treatment (scroll-to-
  invalid-block, duplicate-near-source, keyboard reordering, unsaved-
  changes guard, autosave) except the Preview-link warning, which does
  not apply — shared sections have no standalone preview route (Task
  13b).** `shared-section-editor.tsx` already duplicated
  `page-editor.tsx`'s block-list scaffolding structurally (its own
  `SortableBlockRow`, its own `onDragEnd`) before this task touched
  either file, so the same duplication convention was kept rather than
  extracting a shared block-list-editor component neither file's brief
  asked for — lower risk for a remediation task, at the cost of the two
  files' block-editing logic (and its comments) being near-identical by
  design; a future task could extract this into a shared component if a
  third block-list editor ever needs it.
- **No transcript/caption-authoring UI was added for `video_embed`
  (Task 14, brief item 8) — this is a deliberate scope boundary, not a
  gap.** This app only ever embeds third-party video (YouTube/Vimeo
  iframes — see `components/blocks/video-embed-client.tsx` and
  `components/blocks/embed.tsx`); it never hosts a video file itself.
  Both providers already ship their own caption UI on the embedded
  player, and there is no real transcript content anywhere in
  `content/legacy/` to seed a new field with — constraint 4 ("never
  invent client content") rules out adding a field with nothing genuine
  to put in it. What Task 14 did fix: both embed components' `title`
  admin field is wired straight through as the underlying `<iframe>`'s
  real `title` attribute (already true for `embed.tsx`, whose admin
  field is even labeled "Title (accessible name)"), giving the embed a
  real accessible name — that's the actual, in-scope a11y requirement
  for an iframe embed.
- **The axe-core Playwright suite's authenticated-admin block
  (`tests/e2e/accessibility.spec.ts`) is gated on
  `ADMIN_E2E_EMAIL`/`ADMIN_E2E_PASSWORD` and skips (doesn't fail) when
  unset (Task 14).** Per the Task 1 brief ruling (also cited in
  `navigation-links.spec.ts`'s header comment): this repo's only
  Supabase project is live production, with no seeded non-prod
  environment. The single admin account is bootstrapped via `pnpm
  create-admin <email>`, a mutating action against production this
  remediation plan's implementers don't run, and no implementer has (or
  should invent) a real staff password. The public-reachable pages —
  home, products, one product detail, news, resources, contact, search
  (with and without results), 404, admin login, admin forgot-password —
  all run for real and are part of this task's verification. Set both
  env vars to a real staff account's credentials to exercise the
  authenticated block (dashboard, every list screen, one real page
  editor discovered dynamically from the pages list rather than a
  hardcoded id, and the media-picker dialog opened from within it).
- **The axe scan waits 1s after `page.goto()` before analyzing (Task
  14).** Found by a real failure, not by reasoning: scanning immediately
  after load caught `/this-page-does-not-exist`'s 404 content and the
  admin login form's field labels mid-`RevealSection`/opacity-0-start
  fade (CLAUDE.md's motion rules), where text is still blended toward
  the page background and reads as a genuine, if purely transient,
  color-contrast failure — confirmed by re-reading computed styles a
  moment later and seeing fully-opaque, fully-compliant colors. The
  login-form fix below is unrelated and real (see next entry); this wait
  is what makes the *scan* reflect a page's settled state instead of
  racing Framer Motion's paint, the same way a sighted visitor perceives
  it a fraction of a second after load rather than mid-transition.
  `app/(site)/not-found.tsx` also gained `reveal={false}` on its
  `Section` — same "don't delay legibility with an opacity-0 start"
  reasoning CLAUDE.md already gives for heroes, since a 404 page's
  content is the entire reason a visitor is looking at the page.
- **Fixed a real, non-flaky contrast bug on the auth forms (Task 14):**
  `login-form.tsx`/`forgot-password-form.tsx`/`reset-password-form.tsx`'s
  field-caption `<span>`s combined `opacity-70` with the newly-added
  `text-osi-slate-200` wrapper color. `slate-200` is tuned (see the
  design-tokens entry above) to clear 4.5:1 on a navy background *at full
  opacity* — stacking `opacity-70` on top blends it further toward the
  navy-800 form background, landing at 3.21:1. Fix was to drop the
  redundant `opacity-70` (the caption's own `text-xs uppercase
  tracking-wide-label` classes don't need it; the label wrapper already
  sets the correct, compliant color) rather than pick a new color.
- **The public contact form (`contact-form-client.tsx`) gained small
  visible field-caption labels above every input (Task 14), a narrow,
  deliberate exception to this plan's "accessibility fixes shouldn't
  change visual design" standing rule.** Placeholder-only fields fail
  brief item 2's explicit requirement ("persistent visible labels, not
  placeholder-only") outright — a placeholder is not a label; it
  disappears the moment the visitor types. The captions reuse the exact
  small-caps treatment already established in the admin's
  `LabeledField` (`text-xs uppercase tracking-wide-label opacity-70`),
  not a new pattern, and the fields keep their placeholders too, so the
  net visual change is one small caption line per field, not a redesign.
  Compact, repeated-per-row inputs elsewhere (the nav-item inline
  editor in `nav-editor.tsx`, which repeats once per nav item plus one
  per "add child" row) instead got `aria-label` — a real accessible name
  without multiplying every row's height — since a visible caption
  there would compound across a whole tree of nav items for one field
  shape that's never anything other than "Label"/"Link"/"Badge".
- **`AsyncMessage` (`components/admin/ui/async-message.tsx`) is now the
  single `aria-live="polite"` status-region primitive for save/upload/
  validation/login/submission feedback across the whole app, admin and
  public alike (Task 14)** — including the public contact form
  (`components/blocks/contact-form-client.tsx`), which imports it
  despite living outside `components/admin/`. This crosses that
  directory's implied admin-only boundary, but the brief was explicit
  ("reuse the existing AsyncMessage component... rather than inventing a
  second status-announcement mechanism") and a second, parallel
  live-region component for the one non-admin caller would be exactly
  that. It gained a `variant?: "light" | "dark"` prop (default "light",
  unchanged for every existing admin caller on a white/cream form card)
  so the navy-800 auth forms and the contact form's cream/navy-
  configurable background (branching on `data.background === "cream"`,
  same pattern CLAUDE.md documents for gold/slate accents) both get a
  legible error/success color instead of the admin's default
  red-600/green-700 going invisible on a dark background.
- **`ConfirmDialog` gained a `hideCancel` option (Task 14)** — used once,
  to replace the last `window.alert()` in the admin
  (`app/admin/(dashboard)/[entity]/entity-list.tsx`'s product-categories
  change-impact guard) with a real, accessible acknowledgment dialog
  (`aria-labelledby`, focus containment/restoration, Escape) instead of a
  native alert that offers none of that and blocks the whole tab.
- **The admin mobile nav drawer (`components/admin/admin-shell.tsx`) was
  rewritten from a styled `<div>` overlay to a native `<dialog>` via
  `showModal()`/`close()` (Task 14)** — the same pattern already used by
  `ConfirmDialog`/`MediaPicker` (see their own top comments): a native
  modal dialog gets focus containment, Escape-to-close, and focus
  restoration to the trigger element for free, which is exactly what the
  brief flagged as missing (no Escape handling, no focus trap, and a
  focusable full-viewport backdrop `<button>` that took an unstyled
  full-screen focus ring when tabbed to). The old backdrop button is
  gone; the `<dialog>` element itself now fills the viewport and doubles
  as its own dimmed backdrop, closed by clicking it outside the `<aside>`
  drawer (the standard `event.target === event.currentTarget` "click
  outside" check for a full-bleed dialog). `body:has(dialog[open]) {
  overflow: hidden }` in `globals.css` is a single global rule covering
  contained overscroll for all three native dialogs in the app at once,
  rather than a scroll-lock effect duplicated in each.
- **`ReorderButtons` (`components/admin/ui/row-actions.tsx`) and the
  block-array move-up/move-down buttons in `field-renderer.tsx` both
  gained item-specific accessible names via a new `reorderAriaLabel()`
  helper (`lib/admin/reorder-label.ts`) (Task 14)** — "Move up"/"Move
  down" on every row of a reorderable list (page blocks, products,
  generic entities, array-field items) is indistinguishable to a screen
  reader user browsing by control name once there's more than one row.
  Every existing call site had a natural label already in scope (a
  block's type label, a product's name, an entity row's primary column,
  an array item's position) — folding it in is additive: a caller with
  no natural label falls back to the old generic text unchanged.
- **`getTextInputAttrs()` (`lib/admin/field-input-attrs.ts`) infers
  `type`/`inputMode`/`autoComplete`/`spellCheck` for every block/entity
  "text" `FieldSpec` from its `key` name, not a new field on `FieldSpec`
  itself (Task 14).** Adding a dedicated slot would mean touching every
  one of the ~30 block/entity files that declare a `text` field just to
  preserve today's behavior; the key-naming convention (`email`,
  `phone`, `...Url`/`...Href`, `slug`/`...Key`/`...Id`/`..._code`) is
  already consistent across every schema in this codebase, so a
  heuristic carries enough signal without the churn. Deliberately does
  **not** set `type="url"` for url/href-shaped keys even though several
  hold real absolute URLs — most CTA/link `href` fields hold relative
  internal paths (`/about-us`), and `<input type="url">`'s native
  constraint validation requires a full absolute URL, which would
  silently block saving a perfectly valid internal link (react-hook-form
  doesn't set `noValidate`, so the browser's own validation runs first).
  `inputMode="url"` (keyboard hint only, no validation side effect) is
  the safe lever instead. `autoComplete` is `"off"` across the board
  rather than real `email`/`tel` tokens: every field this heuristic sees
  belongs to CMS content (a directory contact's phone number, a block's
  CTA link) — never the logged-in admin's own identity — so offering the
  admin's own saved autofill data there would be a wrong-content bug,
  not a convenience; contrast with the real login/contact forms, which
  set genuine autocomplete tokens directly since those really are about
  a person's own identity.
- **The media library's Images/Documents toggle
  (`app/admin/(dashboard)/media/media-library.tsx`) gained
  `aria-controls`/a real `role="tabpanel"` and Left/Right arrow-key
  navigation between tabs (Task 14)** — it already had
  `role="tablist"`/`role="tab"`/`aria-selected`, but that's an incomplete
  implementation of the ARIA tabs pattern without keyboard support or a
  tab-to-panel relationship; per the APG tabs pattern, arrow-key
  navigation between tabs isn't optional once a widget claims
  `role="tablist"`. It's the only `role="tab"` UI anywhere in the app
  (confirmed by grep), so no other tab-like widget needed the same fix.
- **Priority 10 (manual responsive/keyboard/reduced-motion verification)
  was done narrowly, not exhaustively, given this task's size (Task
  14).** Checked in a real Chromium browser: the public mega-menu drawer
  at 375px (opens, Escape closes, focus restored to the "Menu" trigger —
  confirming the same native-dialog-equivalent pattern the admin drawer
  now also uses behaves correctly in this codebase), reduced-motion
  (`prefers-reduced-motion: reduce`) leaves a `RevealSection`'s content
  at full opacity immediately with no fade, the home page at 768px has
  no horizontal overflow, and the search page's focus-visible outline
  renders (`outlineStyle: solid`, not `none`) at 375px. Not checked, for
  lack of admin credentials (see the axe-suite entry above): the admin
  drawer's own Escape/focus-trap/restoration in a real browser (its
  logic is identical to the mega-menu's own hand-verified pattern, plus
  standard, non-custom `<dialog>` browser semantics — not a from-scratch
  implementation) and any authenticated admin screen at narrow/tablet
  widths. `ConfirmDialog`'s async resolve/cancel/validate/Escape
  behavior is covered in a real (if jsdom-simulated) test environment by
  `confirm-dialog.test.tsx`, not a live browser.

## Task 15 — content integrity and operational safeguards

- **Archive/soft-delete scope is exactly 4 tables: `pages`, `products`,
  `news_posts`, `resources`** (migration 0029_archived_status.sql) — the
  task-15 brief's own list, not extended to industries/applications/
  locations/directory_contacts (those keep draft/published only). Public
  reads already filter to `status = 'published'`, so an archived row is
  automatically excluded with zero read-path changes.
  - **Retention: archived content is retained indefinitely until an
    admin explicitly hard-deletes it.** No automated purge/cron job was
    built — this stack has no scheduled-job infrastructure (no Edge
    Functions, no external cron), and building one from scratch is
    disproportionate scope for "add an archive status." If a real
    retention window is ever wanted, it would need either a scheduled
    Vercel Cron route or a Supabase pg_cron job (available on paid
    Supabase tiers — this project is currently on Free, see the backup
    finding below), neither of which exists today.
  - **`pages` archive/restore goes through new SECURITY DEFINER RPCs**
    (`archive_page_atomic`/`restore_page_atomic`) rather than a plain
    `.update()`, because `pages`' UPDATE RLS policy was locked down to
    admin-only back in migration 0017 (Task 3) — an editor's regular
    client can't update that table directly at all, draft or not.
    `products`/`news_posts`/`resources` never got that same lockdown
    (their UPDATE policy is still the original "staff manage `<table>`"
    `for all using (is_staff())` grant), so their archive/restore is a
    plain `updateEntityRow(table, id, { status })` call — no new RPC
    needed for those three.
  - Archiving a *published* row also needs the `publish` capability (it
    un-publishes as part of archiving, for pages that means deleting its
    `page_publications` row) — restoring only ever lands back in
    `draft`, never straight back to `published`, so restore is always
    plain `edit_drafts` work. Same `requirePublishCapabilityForStatusChange`
    rule already used for every other status-touching save.

- **Redirect chain limit: 3 hops** (`lib/validation/redirects.ts`'s
  `MAX_REDIRECT_CHAIN_HOPS`) — the task-15 brief left the exact number to
  the implementer. Chosen because the legacy site being migrated never
  had more than one redirect hop for any real URL, and because a chain
  that long is itself a sign the redirects table needs tidying, not a
  case worth silently supporting forever. The check only walks *forward*
  from the new/edited redirect's own `to_path` — it does not re-check
  every other existing redirect's chain on every save (that's unbounded
  work as the table grows); this catches the realistic case (an editor
  extending a chain they can see) without a full-table re-validation on
  every write. A DB-level `check (from_path <> to_path)` constraint
  (migration 0030, mirroring `product_related`'s existing
  `product_id <> related_product_id` precedent) backs up the one-step
  self-loop case specifically; the multi-hop cases are necessarily
  app-level only (a CHECK constraint can't see other rows).

- **Publish preflight (`lib/data/publish-preflight.ts`) is
  warning-only except invalid block data**, which is a hard error —
  matching `validateBlockList`'s existing save-time behavior rather than
  inventing a second notion of "invalid." Broken links, missing alt
  text, unsafe URLs, and duplicate anchor ids are all surfaced in a
  banner in the page editor and never block Publish — "communicate
  impact," not "prevent publishing until perfect," per the task's own
  acceptance criterion. Missing-alt detection is scoped to *tracked*
  media-library uploads referenced by URL in the page's own blocks —
  a legacy image with no `media_assets` row (resolved via
  `lib/media.ts` per constraint 3) isn't flagged, consistent with how
  alt-text enforcement is already scoped everywhere else in this
  codebase.

- **Slug-change redirect creation is atomic with publish, not a
  follow-up call** — `publish_page_atomic` (migration
  0031_publish_slug_redirect.sql) gained two new optional, defaulted
  trailing parameters (`p_create_redirect`, `p_redirect_status_code`)
  rather than a second RPC the app calls right after publishing, so the
  redirect row is written in the exact same transaction as the publish
  itself. Scoped to `pages` only, per the brief's own "products are a
  stretch goal" note — products don't have an equivalent slug-change
  flow in this task; extending the same pattern to `saveProductAction`
  would need its own atomic-RPC change and was cut for time.

- **Submissions CSV export is approved scope** (the brief's own "decide
  ... implement CSV export only if approved" — the controller's dispatch
  for this task treated it as pre-approved). Implemented as a
  `view_submissions`-gated Server Action returning CSV text (no schema
  change), downloaded client-side via a Blob + temporary `<a download>`
  link — there's no file-response mechanism for a Server Action to
  return directly. Retention: same "no automated purge" policy as
  archived content; a manual delete already exists at the DB level via
  the existing "staff can delete submissions" RLS policy, so no new
  deletion UI was added.

- **`scripts/report-content-integrity.ts` duplicates a little query
  logic instead of calling `listBrokenLinks()`/`findMediaAssetUsages()`
  directly** — every `lib/data/*.ts` function goes through
  `lib/db/client.ts`'s `createServerDbClient()`, which calls
  `next/headers`' `cookies()` and throws outside an actual Next.js
  request context (which a plain `tsx` script is not). Every existing
  script in this repo hits the same wall and works around it the same
  way (`createServiceRoleDbClient()` instead) — this script follows that
  established convention for its own reads, while still importing every
  *pure*, DB-independent piece those two files already export
  (`extractInternalLinkCandidates`/`isIgnorableCandidate`/
  `findBrokenPaths`, `validateAltRequirement`) so the actual
  "is this broken/missing" logic isn't duplicated, only the DB access
  shape is.

- **Backup/restore: this project's Supabase organization is on the Free
  plan** (confirmed via the Supabase MCP's `get_organization` — plan:
  `"free"`), which means **no automated daily backups and no
  point-in-time recovery are provisioned today** — both are paid-tier
  Supabase features. See `docs/BACKUP-RESTORE.md` for the full writeup,
  including the honest limitation that the page-revision-restore flow
  was verified by reading the code and adding a targeted test, not by a
  live, authenticated click-through in `/admin` — this implementer
  environment has no seeded admin account and the remediation plan's
  standing rules forbid running `create-admin`/seed scripts (the exact
  same wall Task 14 hit for its own authenticated-admin axe tests,
  documented the same way there).

- **Branding module's seeded "warning" status color: `#92400E`, chosen
  for WCAG AA contrast, not migrated from any existing pixel** — the
  branding Phase 1 brief (`.superpowers/sdd/2026-09-15-branding-module-
  and-block-theming/`) required seeding a semantic "warning" role
  alongside error/success/info, but no warning tone exists anywhere in
  the pre-branding codebase (`StatusMessage`'s `tone` union
  — `components/ui/public-primitives.tsx` — is only `"info" | "success" |
  "error"`), so there was no real value to preserve here; this is new
  territory, not a migration. An initial pick of `#B45309` (Tailwind
  amber-700) shipped in the first branding-module commit but only
  reached 4.18:1 contrast against the seeded light surface
  (`osi-cream-100` / `#F2E9DE`) — below the 4.5:1 WCAG AA normal-text
  threshold `lib/branding/schema.ts`'s own contrast validator enforces
  for every other text-bearing role, an oversight caught because that
  validator didn't yet check the four status roles at all. Corrected to
  `#92400E`, which clears both light surfaces the seed defines with
  margin: 5.90:1 against `osi-cream-100`, 6.83:1 against the "technical
  plate" raised surface (`#FFFAF4`). `lib/branding/schema.ts`'s
  `brandingConfigV1Schema` now contrast-checks `error`/`success`/
  `warning`/`info` against `lightSurface` the same way it already
  checked `textOnLight`/`mutedTextOnLight`, so a future seed change that
  reintroduces a too-light status color fails validation immediately
  instead of shipping silently.

- **Branding fonts are declared statically but activated and requested through the published role mapping** — Next.js requires font loaders to be statically analyzable at build time, while the selected catalog keys are stored publication data resolved per request. Phase 2 therefore declares the seven web-font families in a public-route-only module with `preload: false`, adds only the selected font-variable classes to the server-rendered public boundary, and maps the four roles through validated code-owned stacks. The CSS may describe the whole catalog, but browsers request only faces actually referenced by rendered roles and weights. This preserves request-time selection without loading the catalog on `/admin/*`; production inspection confirmed zero public font requests on `/admin/login`.

- **Published branding is emitted as a scoped server-rendered style object, not a generated stylesheet string** — `PublicThemeBoundary` receives the server-only published resolver result and applies deterministic custom properties through React's `style` serialization. The compiler accepts untrusted input only through the versioned Zod schema, ignores editable labels/notes when generating CSS, and falls back atomically to the code-owned OSI seed. Variables are scoped to `.public-site.site-shell`; the root layout carries no public colors/fonts, so public branding cannot recolor or re-font the admin shell.

- **Block appearance is a reference-based inheritance cascade, not copied styling data** — renderers resolve the validated built-in fallback, the published block-type default, and the optional block-instance override in that order. New blocks save an empty `appearance` object and therefore continue to follow future branding changes; legacy blocks with no appearance field keep their existing `background` behavior through the compatibility adapter. Every registered block declares its supported slots, so an image-only block never receives meaningless typography controls.

- **Unsaved branding preview crosses an isolated same-origin iframe as validated data only** — the admin sends the versioned branding object and an already selected media URL through `postMessage`; the receiver verifies the origin, re-parses the complete object with Zod, and compiles only known CSS variables. It never accepts CSS, class names, HTML, script, external stylesheets, or arbitrary message commands. The real-page preview uses the saved branding draft and remains capability-protected.

- **The active public palette is twelve governed brand slots rather than an unbounded color collection** — the schema caps brand-category swatches at twelve and the seeded module intentionally fills those slots. Administrators can rename and recolor them while stable IDs preserve every reference. System colors, including status tones and the fixed focus indicator, remain outside that creative cap. There is no destructive swatch-delete control, so the current UI cannot create a dangling token reference; the usage scanner inventories draft, live, page, shared-section, and historical references for any future reassignment workflow.

- **Brand-logo replacement is a database transaction** — migration `0035_branding_media_replacement.sql` adds `replace_branding_logo_asset_atomic`, which rewrites draft and published logo references, updates their foreign keys, and records the audit event together. Current draft/live usages block deletion; historical branding revisions are reported but intentionally non-blocking and use `ON DELETE SET NULL`, preserving a deterministic text-logo fallback. The same migration adds the deferred unique revision-version index so concurrent history rows cannot share a version.

- **Phase 8a (Visitors Dashboard) skips `@vercel/analytics` entirely, even though it's listed in this file's Stack section as intended.** The client's Wix Premium dashboard needs replicating inside `/admin`, and every in-scope report (button clicks, search logging, form-source attribution, blog breakdowns, bot/AI-crawler detection) needs first-party data a generic pageview product can't produce. Adding `@vercel/analytics` on top would double-beacon every page load into a dashboard the client never opens, for zero incremental reporting value. One unified first-party system instead — see `lib/analytics/`, `app/api/analytics/collect/route.ts`, `supabase/migrations/0037_analytics_collection.sql`.

- **Analytics has no `analytics_sessions` table, deliberately** — the original design (before implementation) called for a mutable session row with an atomic upsert RPC (mirroring `publish_page_atomic`'s pattern) so page-view counts/last-seen timestamps could accumulate server-side. Implementation replaced this with denormalized, insert-only rows: every `analytics_page_views` row carries its session's entry attribution (referrer/UTM/traffic category), captured once into a cookie at session start and read back — never recomputed — on every subsequent pageview in that session (an internal navigation's `document.referrer` is the previous page, not the original acquisition source). "Session" facts (page count, duration, bounce rate) become pure `group by session_id` aggregations at report-query time. This let all four analytics tables reuse `form_submissions`' exact, already-proven RLS shape (public `insert with check (true)`, staff-only `select`) instead of introducing a new security-definer/atomic-RPC paradigm and its associated `grant execute` footgun (see the `record_audit_action`/`0019`/`0020` history above) just to allow anonymous `UPDATE` access to one mutable row.

- **Bot/AI-crawler visit logging in `proxy.ts` writes through its own throwaway anon Supabase client** (`lib/analytics/log-bot-visit.ts`), not `lib/data/analytics-events.ts` — proxy.ts cannot use `next/headers`' `cookies()`, the same constraint already documented on `lib/auth/index.ts`'s `publicSlugIsResolvable()`. This is now the third narrowly-scoped, explicitly documented exception to constraint 2's "all DB access lives in `lib/data/*.ts`," alongside `lib/db/client.ts` and `lib/auth/*`.

- **`analytics_search_queries.session_id`/`visitor_id` are nullable** (migration `0039_search_queries_nullable_session.sql`, applied immediately after `0037` created the column as `not null`) — a visitor can land directly on `/search` before the client beacon has ever fired (no prior pageview), so no `osi_sid`/`osi_vid` cookies exist yet. Search-query logging still needs to work for that first visit; unlike page views/events, none of the in-scope search reports need a session join, so `null` is correct rather than fabricating a session that corresponds to no real page view.

- **Phase 8b (Google Search Console) hand-rolls RS256 JWT signing and the OAuth2 token exchange** (`lib/google/service-account-auth.ts`, `node:crypto` only) instead of adding the `googleapis` package — the Search Console API used here is two REST endpoints, and pulling in `googleapis`'s entire multi-service API surface for that is disproportionate, consistent with this project's existing minimalism (no Redis, no headless CMS). `scripts/verify-gsc-connection.ts` exercises this path directly (not through the DB cache, which needs a Next.js request context scripts don't have) once the client provides real service-account credentials.

- **GSC responses cache in a plain DB-backed TTL table (`analytics_gsc_cache`), not a Vercel Cron warm job** — this project has never used Vercel Cron; admin routes are already `force-dynamic`, so "check `fetched_at`, refetch if older than 12 hours" needs zero new infrastructure. A proactive nightly warm job is a legitimate future enhancement, deliberately deferred rather than built speculatively.

- **The Visitors Dashboard's `analytics-reports.ts` aggregates in TypeScript over date-range-filtered rows, not per-report Postgres functions** — deliberately extracted the pure bucketing/labeling logic (`countByKey`, `seriesByDate`, `seriesByHour`, `trafficSourceLabel`, `isBlogPath`) into `lib/analytics/report-aggregation.ts` so it's unit-testable without a DB, verified with 11 passing tests. This site's traffic volume (hundreds to low thousands of rows/month, per the legacy Wix dashboard's own numbers) doesn't justify spreading business logic into ~25 one-off SQL aggregation functions; revisit only if real row counts ever make this slow.

- **"Form Submissions by Traffic Source" / "Contacts by Source" derive a submission's channel by looking up any `analytics_page_views` row for its `session_id`**, not a stored column on `form_submissions` itself — a session's traffic category is already denormalized identically across every page view in that session (see the 8a decision above), so a single unindexed-by-date lookup (`analytics_page_views.session_id in (...)`, deliberately not date-range-filtered — a submission's session may start fractionally before the report window, and a session lives 30 minutes) is sufficient and avoids a second denormalized copy of the same fact.

- **Phase 9 (Blog + Newsletters) — blog posts are a `blog` kind on `news_posts`, not a new table** (migration `0042_news_posts_blog.sql` adds `author_name`, `tags text[]`, `reading_minutes`, plus a GIN index on `tags`). Same status/RLS pattern, same admin entity, same body/cover/excerpt columns, so no new admin screen or RLS to maintain. `/news` and `/blog` are separate public listings over the same table: `lib/data/news.ts` restricts the news readers to news/conference/event and the blog readers to `blog`, so a post is only reachable under its own section (`postHref()` in `lib/routes.ts` picks the URL by kind; search, sitemap and the `news_feed` block use it). `/blog` was added to `SKIPPED_TOP_SEGMENTS` in `proxy.ts`, and the analytics "Blog" reports (`isBlogPath`) now count `/blog` as well as `/news`.

- **Phase 9 — event-date rule narrowed to event/conference.** `newsSchema` required `event_date` for any kind other than `news`; with `blog` added that would have blocked publishing a blog post, so it now applies only to `event` and `conference`.

- **Phase 9 — newsletter confirm/unsubscribe tokens are stateless HMACs, not stored hashes.** `lib/newsletter/tokens.ts` signs `<purpose>:<subscriberId>` with `NEWSLETTER_TOKEN_SECRET`. A hashed one-time token can't be re-derived, but every campaign email needs a working unsubscribe link, so that design would force a stored plaintext token instead. The purpose label stops a confirm link acting as an unsubscribe link (and vice versa); both operations are idempotent, so no expiry/single-use is needed. The cost is that rotating the secret invalidates every link already emailed.

- **Phase 9 — the confirm and unsubscribe pages act on a button press, never on page load.** Mail scanners prefetch links, so a state-changing GET would confirm (or unsubscribe) people automatically. Both Server Actions also re-verify the token themselves rather than trusting the page's earlier check.

- **Phase 9 — the newsletter tables have no anonymous policies at all.** Unlike `form_submissions` (anonymous INSERT), signup must look an email up before deciding what to do, and any anonymous SELECT would expose the whole list. All public writes go through the service-role client in `lib/data/newsletter-subscribers.ts` (the same escape hatch the contact-form rate limit already uses); every table is staff-only under RLS. Signup fails closed when `NEWSLETTER_TOKEN_SECRET` is unset, and always returns the same message whether an address is new, pending or already subscribed, so it can't be used to probe the list.

- **Phase 9 — `manage_newsletter` is editor-permitted; deleting a subscriber is not.** Subscribers/tags/campaigns are day-to-day marketing work (same reasoning as `manage_submissions`), but a permanent delete stays `delete_content` (admin-only). The audit entry for a delete records the subscriber id only, never the email, so an erasure isn't undone by the audit log. Manual "add subscriber" and CSV import were deliberately left out: the client asked for the public signup form as the only intake, and adding people by hand would bypass double opt-in.

- **Phase 9 — newsletter HTML is rendered with `@react-email/render` only, not `@react-email/components`.** The plan called for React Email; `@react-email/components` turned out to be deprecated on npm ("Package no longer supported"), and its successor `react-email` is the preview-app CLI (esbuild, socket.io, …), not a runtime library. `@react-email/render` (React element -> email HTML and plain text) is maintained, and the "components" are only thin wrappers over `table`/`img`/`a` with inline styles, which `components/email/` writes directly. One small new dependency instead of a large one.

- **Phase 9 — email blocks are a separate registry from web blocks** (`lib/email-blocks/`, `components/email/`), with the same `defineX`/palette/`adminFields` shape but their own six blocks (heading, text, image, button, divider, article card). They reuse `FieldRenderer`, the media picker and the Tiptap editor, but not `BlockFieldsForm` (which carries web-only appearance controls). Reordering uses up/down buttons rather than `@dnd-kit` — accessible, and far less code for a short list. The header, unsubscribe link and mailing address are a fixed shell (`newsletter-email.tsx`), deliberately not blocks, so an editor can't send an email without them.

- **Phase 9 — email link and image URLs use different resolvers.** `resolveMediaUrl()` treats every non-absolute value as a legacy media path, so routing a link like `/products` through it would have produced `https://static.wixstatic.com/products`. Links go through `absoluteUrl()`; only image sources go through the legacy-media seam (constraint 3).

- **Phase 9 — a campaign send is a resumable loop, not one long request.** A serverless request can't be trusted to outlive a large list. `sendCampaignStep()` snapshots the audience into `newsletter_campaign_recipients` rows, then sends batches of 100 (Resend's limit) for up to ~8 seconds per call; the editor calls it repeatedly until `done`, and "Resume sending" finishes an interrupted one. Each batch carries a deterministic idempotency key (campaign + exact recipients) so a crash between "provider accepted it" and "we recorded it" can't double-send. Rate limits/outages leave the batch pending; permanent rejections mark it failed. Each recipient's status is re-read at send time, so someone who unsubscribes mid-send is skipped. Every message carries `List-Unsubscribe` + `List-Unsubscribe-Post` (RFC 8058) pointing at `app/api/newsletter/unsubscribe`, which unsubscribes on POST and only redirects to the confirmation page on GET.

- **Phase 9 — sending to the list needs the `publish` capability (admins); drafting, previewing and test-sending need only `manage_newsletter`.** Mailing every subscriber is irreversible and as consequential as publishing a page, which is already admin-only. An editor can do everything up to the final send. A sent campaign is locked and only drafts can be deleted, so a campaign stays as a record of what went out. The audience is a `tag_ids uuid[]` on the campaign (subscribed people with ANY selected tag; empty = everyone) rather than a junction table — a deleted tag simply stops matching anyone.

- **Phase 9 — scheduling and open/click reporting are out of scope**, per the client's choice of "send test email" and "audience segments" only. Delivery status per recipient (sent/failed/skipped, provider message id) is recorded, so reporting can be added later from Resend webhooks without a schema change.
