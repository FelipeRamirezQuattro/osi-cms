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
