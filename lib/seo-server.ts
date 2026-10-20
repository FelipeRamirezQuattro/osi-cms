import { getPublishedBranding } from "@/lib/data/branding";
import { getMediaAssetById } from "@/lib/data/media";
import { getSiteSettings } from "@/lib/data/settings";
import type { Metadata } from "next";
import { organizationJsonLd } from "@/components/seo/json-ld";
import { buildPageMetadata, resolveOgImage, siteUrl } from "@/lib/seo";
import { deriveDescriptionFromBlocks, resolveDescription } from "@/lib/seo-content";

/** Formats social platforms can render. AVIF and SVG can't be used as share images. */
const SHAREABLE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/**
 * The image a link preview shows: the item's own image, else the site-wide
 * default from Settings, else the branding logo when it is a shareable format.
 * Undefined when none applies — better no image than a broken one.
 */
export async function resolveShareImage(specific?: string | null): Promise<string | undefined> {
  const settings = await getSiteSettings();
  const direct = resolveOgImage(specific, settings.default_og_image);
  if (direct) return direct;
  try {
    const branding = await getPublishedBranding();
    const logoId = branding?.config.logo.mediaAssetId;
    const logo = logoId ? await getMediaAssetById(logoId) : null;
    return logo?.url && logo.mime && SHAREABLE_MIME.has(logo.mime) ? resolveOgImage(logo.url, null) : undefined;
  } catch {
    return undefined;
  }
}

type CmsPage = {
  title: string;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  noindex?: boolean | null;
  blocks: { type: string; data: unknown }[];
};

/** Metadata for any page-builder page: explicit SEO fields first, then content-derived fallbacks. */
export async function cmsPageMetadata(page: CmsPage, path: string): Promise<Metadata> {
  const { description } = resolveDescription(page.seo_description, () => deriveDescriptionFromBlocks(page.blocks));
  return buildPageMetadata({
    title: page.seo_title?.trim() || page.title,
    description,
    path,
    image: await resolveShareImage(page.og_image_url),
    noindex: Boolean(page.noindex),
  });
}

/** Organization structured data for the home page: name, URL, logo, phone and social profiles from Settings and Branding. */
export async function getOrganizationJsonLd() {
  const settings = await getSiteSettings();
  const socialLinks = [settings.social_facebook, settings.social_linkedin, settings.social_youtube, settings.social_instagram].filter(
    (url): url is string => Boolean(url),
  );
  let logo: string | undefined;
  try {
    const branding = await getPublishedBranding();
    const logoId = branding?.config.logo.mediaAssetId;
    const asset = logoId ? await getMediaAssetById(logoId) : null;
    logo = asset?.url ? resolveOgImage(asset.url, null) : undefined;
  } catch {
    logo = undefined;
  }
  return organizationJsonLd({ url: siteUrl(), phone: settings.phone, logo, socialLinks });
}
