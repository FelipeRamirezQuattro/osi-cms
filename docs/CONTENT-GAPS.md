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
