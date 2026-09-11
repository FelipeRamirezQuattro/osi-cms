/**
 * Seeds the 3 products with real legacy copy (see docs/CONTENT-GAPS.md —
 * every other product name in the mega menu is name-only and stays
 * unseeded until the client provides copy). Content transcribed from
 * content/legacy/pages/{gasreleasesystem,esp-chem-screen-osi,srp-sand-lift}.json.
 *
 * Idempotent: upserts by (slug, locale), replaces child rows.
 *
 * ESP Chem Screen is filed under the "pumps" category to match the
 * mockup's own mega menu placement (page 4), even though About Us text
 * frames it as a chemical-treatment tool — see docs/DECISIONS.md.
 *
 * Run: pnpm seed:products
 */
import { createServiceRoleDbClient } from "../lib/db/client";

type ProductSeed = {
  slug: string;
  categorySlug: string;
  name: string;
  eyebrow?: string;
  summary: string;
  benefits: string[];
  specs?: { label: string; value: string; unit?: string }[];
};

const PRODUCTS: ProductSeed[] = [
  {
    slug: "gas-release-system",
    categorySlug: "gas-separation",
    name: "Gas Release System",
    eyebrow: "Breaking the curve",
    summary:
      "The fluid rises internally from the gas separation system below (red flow path), and enters through the dip tube with a 45-degree cut and holes at the top. This is a point of access to the Gas Release System (GRS) where the separation of free gas and liquid occurs. The gas will be directed upwards finding an exit port to the casing, releasing the gas (green flow path). On the other hand, the gas-free liquid descends to the bottom of the GRS entering the dip tube with a 45-degree cut allowing the flow towards the pump (yellow flow path).",
    benefits: [
      "Improvement of Gas Separation Efficiency for High Fluid and High GLR Horizontal Wells.",
      "Earlier conversion from ESP to rod pump.",
      "Innovative design that enhances production rates by efficiently separating gas.",
      "Proven performance in gassy conditions.",
      "Achieve the maximum potential of your reservoir by efficiently drawing down your wells.",
      "Deal with free and solution gas.",
    ],
  },
  {
    slug: "esp-chem-screen",
    categorySlug: "pumps",
    name: "ESP Chem Screen",
    eyebrow: "With shut off valve",
    summary:
      "ESP Chem Screen changes the concept of traditional chemical treating. Employing micro-encapsulation technology, all the active components of the most effective liquid chemical treatments in the oil industry are processed in a solid stick. OSI has a complete line of chemical treatment products to deal with scale, paraffin, and corrosion in any well conditions. Based on the analysis of data and samples taken from the well to be treated, OSI's chemical engineering department formulates well-specific compounds. ESP Chem Screen allows operators to place, more precisely, where the chemical needs to be for faster, more effective activation and dispersion. Chemical treatments can last up to six months and be refilled without pulling the tubing. The shut off valve prevents spillage if the tool ever needs to be disconnected and provides protection for workers while eliminating chemical waste.",
    benefits: [
      "More effective treatment of paraffin, scale and corrosion.",
      "Refillable tool design.",
      "Chemical treatment below the packer.",
      "Can be combined with other OSI tools.",
    ],
  },
  {
    slug: "srp-sand-lift",
    categorySlug: "sand-control",
    name: "SRP Sand Lift",
    summary:
      "Odessa Separator's SRP Sand Lift is an advanced downhole tool engineered to address challenges related to sand production in rod pump systems. Designed to prevent workovers due to sand failures, it enhances operational efficiency by extending run times and regulating the rate at which sand falls. Its innovative design allows for easy backflush operations, ensuring minimal and straightforward maintenance, making it highly durable and effective in harsh, sand-laden environments.",
    benefits: [
      "Eliminates the need for workover operations resulting from sand failures.",
      "Prolongs the operational lifespan of SRP systems and shields them from sand intrusion into pump stages.",
      "Enables pumping fluid down the tubing.",
    ],
    specs: [
      { label: "Length of the tool", value: "30 ft standard, adjustable to any stroke length" },
      { label: "Maximum diameter", value: "2", unit: "inches" },
      { label: "Tool connection point", value: "Above the Pull Tube / Valve Rod" },
      { label: "Rod material", value: "8620 Steel or 316SS (upon request)" },
    ],
  },
];

async function main() {
  const db = createServiceRoleDbClient();

  const { data: categories, error: categoriesError } = await db
    .from("product_categories")
    .select("id, slug");
  if (categoriesError) throw categoriesError;
  const categoryIdBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  for (const seed of PRODUCTS) {
    const categoryId = categoryIdBySlug.get(seed.categorySlug);
    if (!categoryId) throw new Error(`Unknown category slug: ${seed.categorySlug}`);

    const { data: product, error: productError } = await db
      .from("products")
      .upsert(
        {
          slug: seed.slug,
          locale: "en",
          name: seed.name,
          category_id: categoryId,
          eyebrow: seed.eyebrow,
          summary: seed.summary,
          status: "published",
          seo_title: `${seed.name} | Odessa Separator Inc`,
          seo_description: seed.summary.slice(0, 155),
        },
        { onConflict: "slug,locale" },
      )
      .select("id")
      .single();
    if (productError) throw productError;

    await db.from("product_benefits").delete().eq("product_id", product.id);
    let position = 0;
    for (const benefit of seed.benefits) {
      position += 10;
      const { error } = await db
        .from("product_benefits")
        .insert({ product_id: product.id, title: benefit, position });
      if (error) throw error;
    }

    if (seed.specs) {
      await db.from("product_specs").delete().eq("product_id", product.id);
      position = 0;
      for (const spec of seed.specs) {
        position += 10;
        const { error } = await db.from("product_specs").insert({ product_id: product.id, ...spec, position });
        if (error) throw error;
      }
    }

    console.log(`Seeded product "${seed.name}" (${seed.categorySlug}/${seed.slug}).`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
