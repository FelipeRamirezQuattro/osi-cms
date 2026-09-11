/**
 * Seeds product_categories and industries from the master prompt's
 * explicit text (§5.1, §5.3) — the only taxonomy values with real
 * client-confirmed names. Applications and a possible 10th industry
 * ("Gas Control", seen on the mockup but not in the prompt's text list)
 * are intentionally left unseeded — see docs/CONTENT-GAPS.md.
 *
 * Idempotent (upsert by slug). Uses the service-role client because no
 * admin_profiles row exists yet to satisfy is_staff() (see the
 * bootstrapping note in supabase/migrations/0001_helpers_and_admin.sql).
 *
 * Run: pnpm seed:taxonomy
 */
import { createServiceRoleDbClient } from "../lib/db/client";

const PRODUCT_CATEGORIES = [
  { slug: "sand-control", name: "Sand Control", position: 10 },
  { slug: "gas-separation", name: "Gas Separation", position: 20 },
  { slug: "pumps", name: "Pumps", position: 30 },
  { slug: "chemical-treatment", name: "Chemical Treatment", position: 40 },
];

const INDUSTRIES = [
  { slug: "chemistry", name: "Chemistry" },
  { slug: "rubber-and-plastic", name: "Rubber & Plastic" },
  { slug: "marine", name: "Marine" },
  { slug: "food-and-beverage", name: "Food & Beverage" },
  { slug: "power", name: "Power" },
  { slug: "pulp-and-paper", name: "Pulp & Paper" },
  { slug: "mining", name: "Mining" },
  { slug: "hvacr", name: "HVACR" },
  { slug: "hydrogen", name: "Hydrogen" },
].map((industry, i) => ({ ...industry, position: (i + 1) * 10 }));

async function main() {
  const db = createServiceRoleDbClient();

  const { error: categoriesError } = await db
    .from("product_categories")
    .upsert(PRODUCT_CATEGORIES, { onConflict: "slug" });
  if (categoriesError) throw categoriesError;
  console.log(`Seeded ${PRODUCT_CATEGORIES.length} product categories.`);

  const { error: industriesError } = await db
    .from("industries")
    .upsert(INDUSTRIES, { onConflict: "slug" });
  if (industriesError) throw industriesError;
  console.log(`Seeded ${INDUSTRIES.length} industries (status: draft).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
