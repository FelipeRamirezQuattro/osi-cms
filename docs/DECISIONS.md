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
