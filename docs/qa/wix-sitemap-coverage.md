# Wix sitemap coverage

Source: `https://www.odessaseparator.com/sitemap.xml` and its 5 child sitemaps (fetched 1 Nov 2026):
`pages` (96 URLs), `blog-posts` (1), `blog-categories` (1), `member-profiles_p_author-profile-chunk` (3),
`member-profiles_p_first-chunk` (empty). Each path was requested on `osi-cms.vercel.app` without following
redirects and compared with the 91 rows of the `redirects` table (`redirect_index`).

Legend: **redirect** = a row in `redirects` answers 301 · **page** = a live CMS page at the same path (200) · **MISSING** = 404 today.

**Result: 101 URL entries (101 = 96 + 1 + 1 + 3) — 89 covered by a redirect, 7 by a live page (`/blog` appears twice: blog index and blog-categories), 5 MISSING.**

The 91 existing redirects are not touched. The 5 missing paths are added in the P3 migration (targets pending OSI confirmation, like the rest).

| Wix path | Covered by | Answers today | Event decision (QA) | Notes |
|---|---|---|---|---|
| `/retrievable-chem-tool` | redirect | /products?category=chemical-treatment |  |  |
| `/osi-esp-packer-type-gas-separat` | redirect | /products?category=gas-separation |  |  |
| `/oil-show-visitor` | redirect | /news | Retire |  |
| `/esp-screen-vortex-desander-osi` | redirect | /products?category=chemical-treatment |  |  |
| `/packer-type-gas-separator-osi` | redirect | /products?category=gas-separation |  |  |
| `/general-8` | redirect | /services/fluid-levels |  |  |
| `/copy-of-g-force` | redirect | /products?category=gas-separation |  |  |
| `/super-lube` | redirect | /products?category=chemical-treatment |  |  |
| `/esp-top-bypass-valve` | redirect | /products?category=chemical-treatment |  |  |
| `/osi-directory` | redirect | /contact |  |  |
| `/osi-pmm-guardian` | redirect | /products?category=chemical-treatment |  |  |
| `/the-nozzle` | redirect | /products?category=sand-control |  |  |
| `/osi-top-intake-bypass` | redirect | /products?category=sand-control |  |  |
| `/inquiry-services-page` | redirect | /services | Keep |  |
| `/training` | redirect | /news | Keep |  |
| `/new-page` | redirect | / |  |  |
| `/sandreleasevalve` | redirect | /products?category=sand-control |  |  |
| `/employee-survey-osi` | redirect | /news | Retire |  |
| `/reciclaje` | redirect | /news | Keep |  |
| `/chamber-type-gas-separator` | redirect | /products?category=gas-separation |  |  |
| `/sg-sst-policies` | redirect | /hse/sg-sst-policies |  |  |
| `/form-sales-team-oil-show` | redirect | /news | Retire |  |
| `/iso-45001` | redirect | /hse |  |  |
| `/slotted-gas-shield` | redirect | /products?category=gas-separation |  |  |
| `/chem-screen` | redirect | /products?category=chemical-treatment |  |  |
| `/combination-tool` | redirect | /products?category=chemical-treatment |  |  |
| `/chemicalinjectionmandrel` | redirect | /products?category=pumps |  |  |
| `/slotted-gas-shield-gas-vent` | redirect | /products?category=gas-separation |  |  |
| `/esp-chem-screen-osi` | redirect | /products/pumps/esp-chem-screen |  |  |
| `/esp-vortex-desander-with-swivel` | redirect | /products?category=chemical-treatment |  |  |
| `/training-vid-2` | redirect | /news | Keep |  |
| `/hiring` | redirect | /careers/hiring |  |  |
| `/pump-guard-screen-osi` | redirect | /products?category=sand-control |  |  |
| `/osi-chem-screen-gas-lift` | redirect | /products?category=chemical-treatment |  |  |
| `/tubing-screen` | redirect | /products?category=sand-control |  |  |
| `/gas-vent-tac` | redirect | /products?category=gas-separation |  |  |
| `/esp-sand-lift` | redirect | /products?category=chemical-treatment |  |  |
| `/osi-mesh` | redirect | /products?category=sand-control |  |  |
| `/products-1` | redirect | /products |  |  |
| `/swpsc-oil-show` | redirect | /news | Archive as news |  |
| `/about-us` | page | — |  |  |
| `/category` | redirect | /blog |  |  |
| `/spe-alce` | redirect | /news | Retire |  |
| `/osi-esp-guardian-shield` | redirect | /products?category=chemical-treatment |  |  |
| `/book-online` | redirect | /contact |  |  |
| `/g-forcepackerless` | redirect | /products?category=gas-separation |  |  |
| `/srp-sand-lift` | redirect | /products/sand-control/srp-sand-lift |  |  |
| `/chem-sticks` | redirect | /products?category=chemical-treatment |  |  |
| `/vortex-desander-osi` | redirect | /products?category=sand-control |  |  |
| `/copia-de-fluid-levels` | redirect | /services/pump-cards |  |  |
| `/osi-hh-alce` | redirect | /news | Retire |  |
| `/screen-vortex-desander-osi` | redirect | /products?category=sand-control |  |  |
| `/esp-vortex-desander-osi` | redirect | /products?category=chemical-treatment |  |  |
| `/bumper-spring` | redirect | /products?category=gas-separation |  |  |
| `/gasreleasesystem` | redirect | /products/gas-separation/gas-release-system |  |  |
| `/super-perf` | redirect | /products?category=sand-control |  |  |
| `/` | page | — |  |  |
| `/wellbore-diagrams` | redirect | /resources | Keep |  |
| `/esp-high-erosion-resistan` | redirect | /products?category=chemical-treatment |  |  |
| `/gas-shield-osi` | redirect | /products?category=gas-separation |  |  |
| `/services-2` | redirect | /services |  |  |
| `/blog` | page | — |  |  |
| `/one-min-mgnr` | redirect | /news | Keep |  |
| `/esp-sand-d` | redirect | /products?category=chemical-treatment |  |  |
| `/esp-vortex-regulator` | redirect | /products?category=gas-separation |  |  |
| `/certifications` | redirect | /hse |  |  |
| `/osi-lunch-and-learn` | redirect | /news | Retire |  |
| `/privacy-policy` | page | — |  |  |
| `/case-study` | redirect | /services | Keep |  |
| `/machine-shop` | redirect | /services/machine-shop |  |  |
| `/workshop-brazil` | redirect | /news | Archive as news |  |
| `/careers` | page | — |  |  |
| `/calc` | redirect | / |  |  |
| `/services-1` | redirect | /services |  |  |
| `/esp-vortex-desander-bypass-valve` | redirect | /products?category=chemical-treatment |  |  |
| `/quick-release` | redirect | /products?category=gas-separation |  |  |
| `/oil-show-visitor-1` | redirect | /news | Retire |  |
| `/esp-no-go-catcher` | redirect | /products?category=chemical-treatment |  |  |
| `/training-vid-1` | redirect | /news | Keep |  |
| `/srp-retrievable-chem-tool` | redirect | /products?category=chemical-treatment |  |  |
| `/chem-filter-tool` | redirect | /products?category=chemical-treatment |  |  |
| `/esp-guardian-shield` | redirect | /products?category=gas-separation |  |  |
| `/gforce` | redirect | /products?category=gas-separation |  |  |
| `/osi-at-alf` | redirect | /news | Retire |  |
| `/terms-and-conditions` | page | — |  |  |
| `/services-4` | redirect | /services |  |  |
| `/webinars` | redirect | /news | Keep |  |
| `/well-shock-kits-osi` | redirect | /products?category=pumps |  |  |
| `/osi-at-pbalf` | MISSING | **404** | Retire | Proposed → /news. Past event, like the other 9 retired events. Required by the brief. |
| `/osi-top-bypass-valve` | redirect | /products?category=sand-control |  |  |
| `/esp-surge-valve` | redirect | /products?category=gas-separation |  |  |
| `/esp-vortex-desander-capillar-osi` | redirect | /products?category=chemical-treatment |  |  |
| `/osihappyhour` | redirect | /news | Retire |  |
| `/gas-release-system-bypass` | MISSING | **404** |  | Proposed → Gas Release System product (by reference). Wix page titled "GRSB". Not in the 96-address inventory. Proposed: redirect to the Gas Release System product. **Pending OSI confirmation** (is it a product of its own?). |
| `/hot-oil-tool` | redirect | /products?category=sand-control |  |  |
| `/surge-valve-packer-type-gas-separat` | redirect | /products?category=gas-separation |  |  |
| `/single-post/odessa-separator-inc-acquires-acs-pump-and-supply-from-diamondback-energy` | redirect | /blog |  | Only blog post. Redirects to /blog; it is not imported as a news item (see below). |
| `/blog` | page | — |  |  |
| `/profile/ggonzales/profile` | MISSING | **404** |  | Proposed → /about-us. Wix member profile (blog author). No CMS equivalent; the only blog post is by one of them. |
| `/profile/sdowlen/profile` | MISSING | **404** |  | Proposed → /about-us. same |
| `/profile/jramirez95283/profile` | MISSING | **404** |  | Proposed → /about-us. same |

## Blog post

`/single-post/odessa-separator-inc-acquires-acs-pump-and-supply-from-diamondback-energy` is the only post in Wix's blog.
It already 301s to `/blog`. Whether to import it as a `blog` news item (so the redirect can point at the post) is OSI's
call; the importer for it would be a separate small task. Until then `/blog` is the right landing page.

## Event pages (QA recommendations for OSI to decide)

QA counted 21 event pages: **Keep** 9, **Archive as news** 2, **Retire** 10 (the "Event decision" column above). These are
recommendations only; nothing in the CMS was changed for them. `/osi-at-pbalf` is one of the 10 to retire and was not in the
original 96-address inventory — it is the only event page missing from the redirect table.

## Not in any sitemap (checked)

- `https://learning.odessaseparator.com/` is a **subdomain** (A `96.18.5.227`, Apache/PHP, `MoodleSession` cookie → Moodle), so it is not a redirect.
  Its DNS record lives in the Wix zone and must be recreated before the cutover (see `docs/LAUNCH-RUNBOOK.md` §3 and step 5).
- `/esp-workshop-2026` is in the importer's manifest but not in Wix's sitemap (unpublished on Wix).
