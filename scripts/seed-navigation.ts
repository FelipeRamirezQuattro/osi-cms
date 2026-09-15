/**
 * Seeds nav_menus/nav_items from the master prompt §7 (mega menu,
 * utility bar, footer columns). Idempotent: clears each menu's items
 * before reinserting, so it's safe to re-run after editing this file.
 *
 * Run: pnpm seed:navigation
 */
import { createServiceRoleDbClient } from "../lib/db/client";

type ItemInput = { label: string; href: string; badge?: string; children?: ItemInput[] };

const UTILITY_ITEMS: ItemInput[] = [
  { label: "Customer Cloud", href: "/services" },
  { label: "Directory", href: "/directory" },
  { label: "Careers", href: "/careers" },
  { label: "About Us", href: "/about-us" },
];

const MEGA_COLUMNS: ItemInput[] = [
  {
    label: "Sand Control",
    href: "#",
    children: [
      { label: "SRP Sand Lift", href: "/products/sand-control/srp-sand-lift", badge: "NEW" },
      { label: "Screen Vortex Desander", href: "/products/sand-control/screen-vortex-desander" },
      { label: "Sand Release Valves", href: "/products/sand-control/sand-release-valves" },
      { label: "Top Bypass Valve", href: "/products/sand-control/top-bypass-valve" },
      { label: "Pump Guard Screen", href: "/products/sand-control/pump-guard-screen" },
      { label: "Dip Tube Bypass", href: "/products/sand-control/dip-tube-bypass" },
      { label: "Super Perf", href: "/products/sand-control/super-perf" },
      { label: "Tubing Screen", href: "/products/sand-control/tubing-screen" },
      { label: "Vortex Desander", href: "/products/sand-control/vortex-desander" },
      { label: "The Nozzle", href: "/products/sand-control/the-nozzle" },
    ],
  },
  {
    label: "Gas Separation",
    href: "#",
    children: [
      { label: "ESP Guard Shield", href: "/products/gas-separation/esp-guard-shield" },
      { label: "ESP Vortex Regulator", href: "/products/gas-separation/esp-vortex-regulator" },
      {
        label: "ESP Tracker Type Gas Separator",
        href: "/products/gas-separation/esp-tracker-type-gas-separator",
      },
      { label: "ESP Surge Valve", href: "/products/gas-separation/esp-surge-valve" },
      { label: "ESP G-Force", href: "/products/gas-separation/esp-g-force" },
      { label: "Gas Release System", href: "/products/gas-separation/gas-release-system" },
    ],
  },
  {
    label: "Pumps",
    href: "#",
    children: [
      { label: "Chemical Injection Mandrel", href: "/products/pumps/chemical-injection-mandrel", badge: "NEW" },
      { label: "ESP Chem Screen", href: "/products/pumps/esp-chem-screen" },
      { label: "Well Shockstick", href: "/products/pumps/well-shockstick" },
    ],
  },
  {
    label: "Resources",
    href: "#",
    children: [
      // "What We Do" (/what-we-do) removed — no page, no product line,
      // and no content anywhere in this project backs it (Task 8 item
      // #7; inventing one would violate CLAUDE.md's "never fabricate
      // client content" rule). "Industries" now points at /products
      // rather than a bare /industries listing — no such listing page
      // exists or is planned (only /industries/[slug] detail pages); the
      // product_grid block's own "Industries" tab on /products already
      // renders industry cards linking to each industry's detail page,
      // so this just routes there instead of duplicating that UI. See
      // task-8-report.md item #5 for the full reasoning.
      { label: "Industries", href: "/products" },
      { label: "About Us", href: "/about-us" },
      { label: "Resources", href: "/resources" },
      { label: "Careers", href: "/careers" },
      { label: "Get In Touch", href: "/contact" },
    ],
  },
];

const FOOTER_COLUMNS: Record<string, ItemInput[]> = {
  "footer-1": [
    // "ESP Packages" (/esp-packages) removed alongside the utility bar's
    // copy above — same reasoning, same broken link, two places it was
    // seeded.
    //
    // "OSI Brochure" (href: "#") removed — a verification pass found it
    // still live in production with a dead placeholder href. No real
    // brochure/datasheet PDF exists anywhere in the legacy scrape (see
    // docs/CONTENT-GAPS.md); inventing a URL would violate CLAUDE.md's
    // "never fabricate client content" rule. Re-add once a real file
    // exists, pointing at it directly.
    { label: "Services", href: "/services" },
  ],
  "footer-2": [
    { label: "Customer Cloud", href: "/services" },
    { label: "Resources", href: "/resources" },
    { label: "Downloads", href: "/resources" },
  ],
  "footer-3": [
    { label: "Directory", href: "/directory" },
    { label: "Components", href: "/products" },
    { label: "Locations", href: "/locations" },
  ],
  "footer-4": [
    { label: "About Us", href: "/about-us" },
    { label: "Careers", href: "/careers" },
    { label: "HSE", href: "/hse" },
  ],
};

async function seedMenu(
  db: ReturnType<typeof createServiceRoleDbClient>,
  key: string,
  items: ItemInput[],
) {
  const { data: menu, error: menuError } = await db
    .from("nav_menus")
    .upsert({ key }, { onConflict: "key" })
    .select("id")
    .single();
  if (menuError) throw menuError;

  const { error: deleteError } = await db.from("nav_items").delete().eq("menu_id", menu.id);
  if (deleteError) throw deleteError;

  let position = 0;
  for (const item of items) {
    position += 10;
    const { data: parent, error: parentError } = await db
      .from("nav_items")
      .insert({
        menu_id: menu.id,
        label: item.label,
        href: item.href,
        badge: item.badge,
        position,
      })
      .select("id")
      .single();
    if (parentError) throw parentError;

    if (item.children) {
      let childPosition = 0;
      for (const child of item.children) {
        childPosition += 10;
        const { error: childError } = await db.from("nav_items").insert({
          menu_id: menu.id,
          parent_id: parent.id,
          label: child.label,
          href: child.href,
          badge: child.badge,
          position: childPosition,
        });
        if (childError) throw childError;
      }
    }
  }
  console.log(`Seeded menu "${key}" with ${items.length} top-level items.`);
}

async function main() {
  const db = createServiceRoleDbClient();
  await seedMenu(db, "utility", UTILITY_ITEMS);
  await seedMenu(db, "mega", MEGA_COLUMNS);
  for (const [key, items] of Object.entries(FOOTER_COLUMNS)) {
    await seedMenu(db, key, items);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
