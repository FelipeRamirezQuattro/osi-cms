import type { Metadata } from "next";
import { requireCapability } from "@/lib/auth";
import { getBrandingDraft } from "@/lib/data/branding";
import { PublicThemeBoundary } from "@/components/branding/public-theme-boundary";
import { BrandingPreviewReceiver } from "@/components/branding/branding-preview-receiver";
import { getPublicFontVariableClassNames } from "@/lib/fonts/public-fonts";
import { FONT_CATALOG_KEYS } from "@/lib/fonts/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Branding preview", robots: { index: false, follow: false } };

export default async function BrandingPreviewPage() {
  await requireCapability("manage_settings");
  const draft = await getBrandingDraft();
  return (
    <PublicThemeBoundary branding={{ config: draft.config, source: "draft", publishedVersion: draft.draft_version }} className={`min-h-dvh ${getPublicFontVariableClassNames(FONT_CATALOG_KEYS)}`}>
      <BrandingPreviewReceiver initialConfig={draft.config} />
    </PublicThemeBoundary>
  );
}
