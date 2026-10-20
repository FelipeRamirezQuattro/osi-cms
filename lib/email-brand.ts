import "server-only";

import { EMAIL } from "@/components/email/email-styles";
import { getMediaAssetById } from "@/lib/data/media";
import { resolvePublishedBranding } from "@/lib/branding/resolve";
import { resolveMediaUrl } from "@/lib/media";
import { absoluteUrl } from "@/lib/seo";

/**
 * What a transactional email needs from the branding config: the name, the
 * logo and the header/link colors. Email clients can't use CSS variables or
 * web fonts, so roles are resolved to literal hex values. Any failure falls
 * back to the built-in palette — a branding outage must never block a
 * confirmation email.
 */
export type EmailBrand = {
  siteName: string;
  logoUrl: string | null;
  logoAlt: string;
  headerBackground: string;
  headerText: string;
  link: string;
  pageBackground: string;
};

export const SITE_NAME = "Odessa Separator";

export const FALLBACK_EMAIL_BRAND: EmailBrand = {
  siteName: SITE_NAME,
  logoUrl: null,
  logoAlt: SITE_NAME,
  headerBackground: EMAIL.navy,
  headerText: EMAIL.white,
  link: EMAIL.navy,
  pageBackground: EMAIL.cream,
};

function absolutize(url: string): string {
  try {
    return resolveMediaUrl(url);
  } catch {
    return absoluteUrl(url);
  }
}

export async function getEmailBrand(): Promise<EmailBrand> {
  try {
    const { config } = await resolvePublishedBranding();
    const swatch = (id: string, fallback: string) => config.swatches.find((s) => s.id === id)?.hex ?? fallback;
    const logoAsset = config.logo.mediaAssetId ? await getMediaAssetById(config.logo.mediaAssetId) : null;
    return {
      siteName: SITE_NAME,
      logoUrl: logoAsset?.url ? absolutize(logoAsset.url) : null,
      logoAlt: config.logo.altText || SITE_NAME,
      headerBackground: swatch(config.roles.darkSurface.swatchId, FALLBACK_EMAIL_BRAND.headerBackground),
      headerText: swatch(config.roles.textOnDark.swatchId, FALLBACK_EMAIL_BRAND.headerText),
      link: swatch(config.roles.primary.swatchId, FALLBACK_EMAIL_BRAND.link),
      pageBackground: swatch(config.roles.lightSurface.swatchId, FALLBACK_EMAIL_BRAND.pageBackground),
    };
  } catch (err) {
    console.error("[email] Branding unavailable for email; using the built-in palette.", err);
    return FALLBACK_EMAIL_BRAND;
  }
}
