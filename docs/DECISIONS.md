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
