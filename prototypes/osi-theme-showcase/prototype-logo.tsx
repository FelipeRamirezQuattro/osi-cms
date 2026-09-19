import { BrandLogo } from "@/components/branding/brand-logo";
import { OSI_SEED_BRANDING_CONFIG } from "@/lib/branding/seed";

/**
 * Uses the exact logo renderer and fallback configured for the production
 * homepage. The CMS asset is deliberately null in this static prototype;
 * replace this one seam with the supplied MediaAsset when it is approved.
 */
export function PrototypeLogo() {
  return (
    <span className="prototype-brand-logo" aria-label="Odessa Separator Inc.">
      <BrandLogo config={OSI_SEED_BRANDING_CONFIG} asset={null} />
    </span>
  );
}
