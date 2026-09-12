/**
 * Seeds the home page (pages + page_blocks) matching mockup p.1, using
 * real copy from content/legacy/pages/home.json where it exists.
 * Idempotent: upserts the page by (slug, locale), replaces its blocks.
 *
 * Images are the legacy site's own Wix-hosted photography, referenced by
 * absolute URL rather than re-uploaded (CLAUDE.md constraint 3). Named
 * handles and the reasoning live in scripts/legacy-images.ts; the full
 * catalogue is content/legacy/image-map.json.
 *
 * Run: pnpm seed:home
 */
import { createServiceRoleDbClient } from "../lib/db/client";
import { LEGACY_IMAGES } from "./legacy-images";

async function main() {
  const db = createServiceRoleDbClient();

  const { data: page, error: pageError } = await db
    .from("pages")
    .upsert(
      {
        slug: "home",
        locale: "en",
        title: "Odessa Separator Inc. — World-class downhole fluid-conditioning systems",
        template: "landing",
        seo_title: "Odessa Separator Inc | Oil field solutions",
        seo_description: "Sand control, Gas separator, Chemical treatment. Odessa Separator Inc.",
        // Published directly rather than left draft: this is Phase 3's
        // architecture proof-of-concept content, not a real client
        // migration (that's Phase 4, which lands everything as draft
        // per the master prompt §8.7 for a human to review first).
        status: "published",
        published_at: new Date().toISOString(),
        is_system: true,
      },
      { onConflict: "slug,locale" },
    )
    .select("id")
    .single();
  if (pageError) throw pageError;

  const { error: deleteError } = await db.from("page_blocks").delete().eq("page_id", page.id);
  if (deleteError) throw deleteError;

  const blocks = [
    {
      type: "hero_full",
      data: {
        background: "navy",
        headline: "Your source for fluid conditioning systems",
        imageUrl: LEGACY_IMAGES.homeHero,
        subhead:
          "We deliver advanced solutions for sand control, gas separation, and chemical treatment—driving innovation and enhancing well performance across the global energy industry.",
        ctas: [
          { label: "Services", href: "/services", variant: "outline-light" },
          { label: "Get in touch", href: "/contact", variant: "solid-gold" },
        ],
      },
    },
    {
      type: "section_heading",
      data: { background: "cream", title: "Tailored Solutions for Your Industry", align: "center" },
    },
    {
      type: "feature_tiles",
      data: {
        background: "cream",
        tiles: [
          {
            title: "Gas Release System",
            body: "Breaking the curve: improvement of gas separation efficiency for high fluid and high GLR horizontal wells.",
            href: "/products/gas-separation/gas-release-system",
            imageUrl: LEGACY_IMAGES.homeTiles[0],
          },
          {
            title: "ESP Chem Screen",
            body: "With shut off valve — treat more effectively, with greater precision.",
            href: "/products/pumps/esp-chem-screen",
            imageUrl: LEGACY_IMAGES.homeTiles[1],
          },
          {
            title: "SRP Sand Lift",
            body: "A sand-control tool for protecting SRP pumps. Eliminates the need for workover operations resulting from sand failures.",
            href: "/products/sand-control/srp-sand-lift",
            imageUrl: LEGACY_IMAGES.homeTiles[2],
          },
          {
            title: "Explore categories",
            href: "/products",
            imageUrl: LEGACY_IMAGES.homeTiles[3],
          },
        ],
      },
    },
    {
      type: "mission_cards",
      data: {
        background: "navy",
        cards: [
          {
            title: "Our Mission",
            body: "OSI is committed to manufacturing top quality products and providing technical support to maximize productivity and profitability.",
            href: "/about-us",
          },
          {
            title: "Global Impact",
            body: "9+ countries in 5 continents using OSI products.",
            href: "/about-us",
          },
        ],
      },
    },
    {
      type: "stat_grid",
      data: {
        background: "navy",
        stats: [
          { value: "$480 million", label: "CAPEX and OPEX savings in the last 5 years" },
          { value: "40,000+", label: "Wells optimized since 1995" },
          { value: "120%", label: "Average increase in the runtime of the wells" },
          { value: "145+", label: "Customers have optimized their ALSs with OSI" },
          { value: "9+", label: "Countries in 5 continents using OSI products" },
        ],
      },
    },
    {
      type: "split_feature",
      data: {
        background: "navy",
        title: "Proven Quality",
        imageUrl: LEGACY_IMAGES.facilityShopFloor,
        body: "OSI's proven systems eliminate issues with sand, solids, gas, and chemical treatment—delivering reliable solutions to the industry's hardest wellbore problems.",
        links: [
          { label: "Sand Control", href: "/products/sand-control" },
          { label: "Gas Separation", href: "/products/gas-separation" },
          { label: "Chemical Treatment", href: "/products/chemical-treatment" },
          { label: "Pumps", href: "/products/pumps" },
        ],
        cta: { label: "Get in touch", href: "/contact" },
      },
    },
    {
      type: "global_map",
      data: {
        background: "navy",
        title: "See our global locations",
        subtitle: "World-class downhole fluid-conditioning systems.",
        mapImageUrl: LEGACY_IMAGES.worldMap,
      },
    },
  ];

  let position = 0;
  for (const block of blocks) {
    position += 10;
    const { error } = await db.from("page_blocks").insert({
      page_id: page.id,
      type: block.type,
      position,
      data: block.data,
    });
    if (error) throw error;
  }

  console.log(`Seeded home page (${page.id}) with ${blocks.length} blocks, status=published.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
