import type { Metadata } from "next";
import { resolveMediaUrl } from "@/lib/media";
import { cleanSeoTitle } from "@/lib/seo-content";

/**
 * Small SEO helpers shared by every route's `generateMetadata` and by the
 * JSON-LD components — one place for "how do we build an absolute URL"
 * and "which image wins" instead of re-deriving it per route.
 */

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl()).toString();
}

/** Page/product-level image wins; falls back to the site-wide default OG image. */
export function resolveOgImage(specific: string | null | undefined, fallback: string | null | undefined): string | undefined {
  const url = specific || fallback;
  return url ? resolveMediaUrl(url) : undefined;
}

export const SITE_NAME = "Odessa Separator Inc.";

export type PageMetadataInput = {
  /** Plain page title. The root layout's template appends the site name. */
  title?: string | null;
  description?: string | null;
  /** Site-relative path, e.g. "/products/sand-control/x". Becomes the canonical URL. */
  path: string;
  /** Already-resolved share image URL (see resolveShareImage in lib/seo-server.ts). */
  image?: string | null;
  type?: "website" | "article";
  noindex?: boolean;
  publishedTime?: string | null;
};

/**
 * One shape for every route's metadata: title, description, canonical, full
 * Open Graph and Twitter card. The canonical is always built from siteUrl(),
 * so it follows NEXT_PUBLIC_SITE_URL to the production domain at go-live.
 */
export function buildPageMetadata(input: PageMetadataInput): Metadata {
  const title = input.title?.trim() ? cleanSeoTitle(input.title) : undefined;
  const description = input.description?.trim() || undefined;
  const url = absoluteUrl(input.path);
  const images = input.image ? [input.image] : undefined;
  return {
    // A title that already carries the site name must not get it appended twice.
    title: title && title.includes("Odessa Separator") ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    robots: input.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title: title ?? SITE_NAME,
      description,
      url,
      siteName: SITE_NAME,
      type: input.type ?? "website",
      locale: "en_US",
      images,
      ...(input.type === "article" && input.publishedTime ? { publishedTime: input.publishedTime } : {}),
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: title ?? SITE_NAME,
      description,
      images,
    },
  };
}
