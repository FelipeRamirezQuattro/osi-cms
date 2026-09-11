import { resolveMediaUrl } from "@/lib/media";

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
