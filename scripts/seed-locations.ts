/**
 * Seeds a new system page at /locations using the already-registered
 * global_map block (the same block home/contact already use — see
 * CLAUDE.md "Product detail pages don't use page_blocks" section's
 * sibling note on block reuse). Task 8 item #6: /locations has no
 * backing page at all today (confirmed via a read-only query against
 * the live project — see task-8-report.md).
 *
 * NOT run by the implementer — this is a live content write against the
 * project's only environment (production), reviewed by the controller
 * first, same discipline as a migration. See task-8-report.md for what
 * this does and why.
 *
 * Idempotent: upserts `pages` by (slug, locale) and replaces its blocks
 * every run, same pattern as scripts/seed-static-pages.ts.
 *
 * IMPORTANT — also writes `page_publications` directly, unlike
 * seed-static-pages.ts/migrate-directory.ts: migration 0017 removed the
 * public site's read path from `pages` entirely (lib/data/pages.ts's
 * getPageBySlug reads only `page_publications`), and nothing keeps that
 * table in sync automatically going forward — the one-time backfill in
 * 0017 only covered pages that were already `status = 'published'` in
 * `pages` *at the moment that migration ran*. A brand-new page seeded
 * today with `status: 'published'` in the `pages` row alone would exist
 * in the table but stay completely invisible on the public site (a
 * silent no-op, not an error) unless something also creates its
 * page_publications row. This script does that itself by hand-building
 * the same `{ meta, blocks }` snapshot shape publish_page_atomic
 * constructs (supabase/migrations/0017_publishing_permissions_atomic.sql),
 * since that RPC's own `has_capability('publish')` check requires a real
 * authenticated admin session (auth.uid()) that a service-role script
 * doesn't have.
 *
 * Run: pnpm exec tsx --env-file=.env.local scripts/seed-locations.ts
 */
import { createServiceRoleDbClient } from "../lib/db/client";
import type { Json, Tables } from "../lib/db/database.types";

async function main() {
  const db = createServiceRoleDbClient();

  const { data: page, error: pageError } = await db
    .from("pages")
    .upsert(
      {
        slug: "locations",
        locale: "en",
        title: "Locations",
        template: "standard",
        seo_title: "Locations | Odessa Separator Inc",
        seo_description: "Odessa Separator Inc.'s global network of offices and distributors.",
        status: "published",
        published_at: new Date().toISOString(),
        is_system: true,
      },
      { onConflict: "slug,locale" },
    )
    .select("*")
    .single();
  if (pageError) throw pageError;

  const { error: deleteError } = await db.from("page_blocks").delete().eq("page_id", page.id);
  if (deleteError) throw deleteError;

  const blockSeeds: { type: string; data: Record<string, Json> }[] = [
    {
      type: "hero_page",
      data: { background: "navy", eyebrow: "Where to find us", title: "Locations" },
    },
    {
      type: "global_map",
      data: {
        background: "cream",
        title: "Our global locations",
        subtitle: "Offices and distributors across our network.",
        ctaLabel: "Get in touch",
        ctaHref: "/contact",
      },
    },
  ];

  let position = 0;
  for (const block of blockSeeds) {
    position += 10;
    const { error } = await db
      .from("page_blocks")
      .insert({ page_id: page.id, type: block.type, position, data: block.data });
    if (error) throw error;
  }

  const { data: blocks, error: blocksError } = await db
    .from("page_blocks")
    .select("*")
    .eq("page_id", page.id)
    .order("position", { ascending: true });
  if (blocksError) throw blocksError;

  // Mirrors publish_page_atomic's own snapshot shape exactly (see this
  // file's header comment) — `meta` is the full pages row minus the
  // generated search_vector column, `blocks` is every visible block in
  // position order.
  const fullPage = page as Tables<"pages"> & { search_vector: unknown };
  const meta: Record<string, unknown> = { ...fullPage };
  delete meta.search_vector;
  const snapshot = { meta, blocks: blocks ?? [] };

  const { error: publicationError } = await db.from("page_publications").upsert(
    {
      page_id: page.id,
      slug: page.slug,
      locale: page.locale,
      snapshot: snapshot as unknown as Json,
      published_at: new Date().toISOString(),
    },
    { onConflict: "page_id" },
  );
  if (publicationError) throw publicationError;

  console.log(`Seeded /locations with ${blockSeeds.length} blocks and published it.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
