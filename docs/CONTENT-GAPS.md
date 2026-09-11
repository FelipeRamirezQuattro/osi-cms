# Content gaps

Running log of content the mockup or sitemap calls for that the legacy
scrape doesn't back with real data. Populated as they're found; resolved
items get struck through with the resolution, not deleted.

## Found during Phase 0 read-through

- **No PDF/file URLs anywhere in the scrape.** Zero brochure, datasheet,
  certificate, or download links were captured, despite the mockup
  showing "DOWNLOAD PDF" (product pages), "OSI Brochure" (footer), and
  the SG-SST page's own text referencing a downloadable complaint form.
  Every download CTA site-wide needs a placeholder + a client ask for
  the actual file.
- **World map country coverage is thinner than it looks.** The mockup
  pins 15 countries (Canada, US, Mexico, Colombia, Ecuador, Brazil,
  Argentina, England, Romania, Egypt, Oman, Saudi Arabia, China,
  Indonesia, Australia). Real distributor contacts in
  `osi-directory.json` back only 7: USA, Canada, Oman, Mexico, Argentina,
  Egypt, Colombia. About Us text adds Ecuador and Brazil as expansion
  markets (no contact records). **England, Romania, Saudi Arabia, China,
  Indonesia, Australia have zero backing data anywhere in the scrape** —
  need real distributor contacts from the client before seeding
  `locations` for those countries, or drop the pins.
- **OSI Rod Pump Division** (About Us: founded 2025, HQ Midland, TX) —
  not reflected in the mockup's location map, mega menu, or directory.
  Ask client whether this should be a `locations` entry.
- **"See this tool in 3D"** — out of scope per the master prompt; render
  the button, link to `#`, already logged here per instruction.
- Only 3 products (Gas Release System, ESP Chem Screen, SRP Sand Lift)
  have real legacy copy. Every other name in the mega menu / product
  grid (ESP Guard Shield, Screen Vortex Desander, Chemical Injection
  Mandrel, etc.) is name-only — needs client copy before publishing past
  draft, or an explicit decision to launch with stubs (see open question
  #5 in the master prompt).
- Page 7 of the mockup (product detail template) has mismatched
  placeholder copy — the H1 says "ESP Vortex Desander" but all body
  paragraphs describe "ESP PMM Guardian." Treating as pure lorem, not a
  real spec for either product.
- Home page mission cards ("Our Mission" / "Global Impact") repeat
  identical placeholder link text in both cards — likely a mockup
  duplication artifact, not intentional shared content.

## Found during Phase 2 (schema/taxonomy)

- **Applications taxonomy has no source data.** Unlike industries, the
  master prompt never lists explicit application names, and the
  mockup's Applications tab wasn't legible enough to transcribe with
  confidence. The `applications` table exists but is unseeded — needs
  client input before Phase 3 can build the Applications filter tab.
- **Possible 10th industry: "Gas Control."** It appeared in my read of
  the mockup's Industries tab pills, but isn't in the master prompt's
  explicit 9-name list (Chemistry, Rubber & Plastic, Marine, Food &
  Beverage, Power, Pulp & Paper, Mining, HVACR, Hydrogen). Only seeded
  the confirmed 9 in `scripts/seed-taxonomy.ts` — my own screenshot
  reading could be wrong, so confirm with the client before adding it.

## Found during Phase 3 (block rendering)

- **No map embed URL.** `site_settings.map_embed_url` is unset, so the
  `contact_details` block's map renders "Map unavailable." Needs a
  Google Maps (or similar) embed URL for 1001 E. Pearl Street, Odessa,
  TX from the client, or a decision to use a static map image instead.
- **`news_feed` renders nothing** on the home page — no `news_posts`
  exist yet (the mockup's "Baker Hughes Technical Conference" / "Happy
  Hour" / "Artificial Lift Forum" items aren't confirmed structured data
  — dates, links — so none were fabricated). Populate via the admin or
  Phase 4 once real event details are available.

## Found during Phase 4 (content migration)

- **Machine Shop's page heading merged into one very long H2.** The
  generic split-heading recombination (see CLAUDE.md) correctly joins
  every adjacent heading with nothing between them, but on this page
  that chain runs from "MACHINE SHOP" all the way through "TURNING
  CENTERS DIAMETERS UP 30'' - LENGTHS UP TO 160''" — accurate to the
  source's structure, but too long to read as one heading. Needs a human
  to split it into separate headings in the admin (Phase 5) before
  publishing `/services/machine-shop`.
- **Two directory emails don't match the person's name**: Abdullah Sakr
  → `amohammed@lufkin.com`, Rana M. El-Saghier → `IRMohamed@lufkin.com`
  (both Lufkin contacts). Transcribed exactly as scraped, not corrected
  — could be a shared team inbox, a scrape artifact, or a genuine
  mismatch; ask the client before publishing.
- **One Canadian distributor's company name wasn't captured** in the
  scrape (Brian Waterhouse / Brad Metke, Edmonton AB — only a "Toll-free"
  number and address, no company name in the source paragraphs).
  Recorded as "Edmonton distributor (company name not captured in
  scrape)" in `locations`; needs the client to fill in.
- **`services-4.json` / Customer Cloud client logos never migrated
  anywhere** — Occidental, Matador, Gran Tierra, Chevron, Lario, and
  five other operator names/logos appear only in that scraped page,
  which is out of scope (external link). Flagging in case the client
  wants those logos reused as a "trusted by" `logo_strip` elsewhere.

## Found during Phase 6 (forms, search, SEO)

- **Contact-form email notifications are wired but unconfigured.**
  `RESEND_API_KEY`/`RESEND_FROM_EMAIL`/`CONTACT_NOTIFICATION_EMAIL` are
  all unset — master prompt open question #4 ("who receives contact-form
  notifications?") was never answered. Submissions still save correctly
  to `form_submissions`/the admin inbox regardless; only the outbound
  email is inert until the client provides a Resend account and a
  recipient address.
- **Resolved: Services stays as CMS pages, the `services` table is
  intentionally unused.** (Was an open question above; decided
  2026-09-11.) Fluid Levels/Pump Cards/Machine Shop keep living in
  `pages`/`page_blocks`, edited via `/admin/pages` like any other page.
  Removed `services` from the generic entity admin (`/admin/services` no
  longer exists) and from `lib/data/taxonomy.ts` (`listServices`/
  `getServiceBySlug` were dead code once nothing called them).
  `product_grid`'s "Services" filter tab now pulls from real `pages`
  under `services/` (`lib/data/pages.ts → listPagesUnderSlug`) instead
  of the empty table — it'll show nothing until those 3 pages are
  actually published (still `draft` as of this writing, same as every
  other Phase 4 migrated page). The `services` table itself stays in the
  schema (master prompt §5.3) but nothing reads or writes it going
  forward.
- **Still open: News.** `news_posts` has zero rows (no legacy content —
  nothing to migrate) and no public `/news`/`/news/[slug]` route.
  `/admin/news` CRUD exists and works; the home page's `news_feed` block
  already renders nothing gracefully when empty, so this isn't blocking
  anything today. Revisit once there's real news/event content to
  publish — building the public routes then is a small, low-risk
  addition (same pattern as everything else in `app/(site)/`), not
  worth doing speculatively against an empty table.
