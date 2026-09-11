/**
 * Seeds the /products and /contact pages (mockup p.5/6 and p.8).
 * Idempotent: upserts by (slug, locale), replaces blocks.
 *
 * Run: pnpm seed:static-pages
 */
import { createServiceRoleDbClient } from "../lib/db/client";
import type { Json } from "../lib/db/database.types";

type PageSeed = {
  slug: string;
  title: string;
  template: string;
  seoTitle: string;
  seoDescription: string;
  blocks: { type: string; data: Record<string, Json> }[];
};

const PAGES: PageSeed[] = [
  {
    slug: "products",
    title: "Products",
    template: "standard",
    seoTitle: "Products | Odessa Separator Inc",
    seoDescription: "World-class downhole fluid-conditioning systems from Odessa Separator Inc.",
    blocks: [
      {
        type: "hero_page",
        data: {
          background: "navy",
          eyebrow: "World-class downhole fluid-conditioning systems",
          title: "Products",
        },
      },
      {
        type: "product_grid",
        data: {
          background: "cream",
          title: "Products",
          ctaLabel: "Connect with a specialist",
          ctaHref: "/contact",
        },
      },
    ],
  },
  {
    slug: "contact",
    title: "Contact Us",
    template: "contact",
    seoTitle: "Contact Us | Odessa Separator Inc",
    seoDescription: "Get in touch with Odessa Separator Inc.",
    blocks: [
      {
        type: "hero_page",
        data: {
          background: "cream",
          eyebrow: "World-class downhole fluid-conditioning systems",
          title: "Contact Us",
        },
      },
      {
        type: "contact_details",
        data: { background: "navy" },
      },
      {
        type: "contact_form",
        data: { background: "navy", title: "Leave us a message" },
      },
      {
        type: "global_map",
        data: {
          background: "navy",
          title: "See our global locations",
          subtitle: "World-class downhole fluid-conditioning systems.",
        },
      },
    ],
  },
];

async function main() {
  const db = createServiceRoleDbClient();

  for (const pageSeed of PAGES) {
    const { data: page, error: pageError } = await db
      .from("pages")
      .upsert(
        {
          slug: pageSeed.slug,
          locale: "en",
          title: pageSeed.title,
          template: pageSeed.template,
          seo_title: pageSeed.seoTitle,
          seo_description: pageSeed.seoDescription,
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

    let position = 0;
    for (const block of pageSeed.blocks) {
      position += 10;
      const { error } = await db.from("page_blocks").insert({
        page_id: page.id,
        type: block.type,
        position,
        data: block.data,
      });
      if (error) throw error;
    }
    console.log(`Seeded /${pageSeed.slug} with ${pageSeed.blocks.length} blocks.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
