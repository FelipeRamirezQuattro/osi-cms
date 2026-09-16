import { createServerDbClient } from "@/lib/db/client";
import { configReferencesBrandToken, jsonReferencesBrandToken, type BrandTokenUsage } from "@/lib/branding/usage";
import { safeParseBrandingConfig } from "@/lib/branding/schema";

export async function findBrandTokenUsages(tokenId: string): Promise<BrandTokenUsage[]> {
  const db = createServerDbClient();
  const usages: BrandTokenUsage[] = [];
  const [draft, publication, revisions, pageBlocks, sharedBlocks, pagePublications, sharedPublications] = await Promise.all([
    db.from("site_branding").select("config").eq("id", true).maybeSingle(),
    db.from("site_branding_publications").select("config").eq("id", true).maybeSingle(),
    db.from("site_branding_revisions").select("id, version, config"),
    db.from("page_blocks").select("id, type, data"),
    db.from("shared_section_blocks").select("id, type, data"),
    db.from("page_publications").select("page_id, slug, snapshot"),
    db.from("shared_section_publications").select("section_id, key, snapshot"),
  ]);
  for (const result of [draft, publication, revisions, pageBlocks, sharedBlocks, pagePublications, sharedPublications]) if (result.error) throw result.error;

  const draftConfig = safeParseBrandingConfig(draft.data?.config);
  if (draftConfig.success && configReferencesBrandToken(draftConfig.data, tokenId)) usages.push({ source: "branding", id: "draft", label: "Branding draft", blocking: true });
  const liveConfig = safeParseBrandingConfig(publication.data?.config);
  if (liveConfig.success && configReferencesBrandToken(liveConfig.data, tokenId)) usages.push({ source: "branding", id: "live", label: "Live branding", blocking: true });
  for (const row of revisions.data ?? []) { const parsed = safeParseBrandingConfig(row.config); if (parsed.success && configReferencesBrandToken(parsed.data, tokenId)) usages.push({ source: "history", id: row.id, label: `Branding revision ${row.version}`, blocking: false }); }
  for (const row of pageBlocks.data ?? []) if (jsonReferencesBrandToken(row.data, tokenId)) usages.push({ source: "page_block", id: row.id, label: `${row.type} page block`, blocking: true });
  for (const row of sharedBlocks.data ?? []) if (jsonReferencesBrandToken(row.data, tokenId)) usages.push({ source: "shared_section_block", id: row.id, label: `${row.type} shared-section block`, blocking: true });
  for (const row of pagePublications.data ?? []) if (jsonReferencesBrandToken(row.snapshot, tokenId)) usages.push({ source: "page_publication", id: row.page_id, label: `Published page /${row.slug}`, blocking: true });
  for (const row of sharedPublications.data ?? []) if (jsonReferencesBrandToken(row.snapshot, tokenId)) usages.push({ source: "shared_section_publication", id: row.section_id, label: `Published shared section ${row.key}`, blocking: true });
  return usages;
}
