import { getBrandingDraftAction, getPublishedBrandingAction, listBrandingRevisionsAction } from "@/lib/actions/branding";
import { getMediaAssetById } from "@/lib/data/media";
import { getBlockPalette } from "@/lib/blocks/registry";
import { BrandingEditor } from "@/components/admin/branding-editor";

export const dynamic = "force-dynamic";

export default async function BrandingPage() {
  const [draft, published, revisions] = await Promise.all([
    getBrandingDraftAction(),
    getPublishedBrandingAction(),
    listBrandingRevisionsAction(12),
  ]);
  const [logoAsset, publishedLogoAsset, faviconAsset] = await Promise.all([
    draft.config.logo.mediaAssetId
      ? getMediaAssetById(draft.config.logo.mediaAssetId)
      : Promise.resolve(null),
    published?.config.logo.mediaAssetId
      ? getMediaAssetById(published.config.logo.mediaAssetId)
      : Promise.resolve(null),
    draft.config.favicon?.mediaAssetId
      ? getMediaAssetById(draft.config.favicon.mediaAssetId)
      : Promise.resolve(null),
  ]);

  return (
    <BrandingEditor
      key={draft.draft_version}
      draft={draft}
      published={published}
      revisions={revisions}
      palette={getBlockPalette()}
      initialLogoAsset={logoAsset}
      initialFaviconAsset={faviconAsset}
      publishedLogoUrl={publishedLogoAsset?.url ?? null}
    />
  );
}
