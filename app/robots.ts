import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { isSiteIndexable, PRODUCTION_ORIGIN } from "@/lib/indexing";
import { siteUrl } from "@/lib/seo";

// Reads the request host, so it is rendered per request: the same build is
// the review site (everything disallowed) and, after DNS moves, the live
// site (normal rules) — see lib/indexing.ts and docs/LAUNCH-RUNBOOK.md.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

  if (!isSiteIndexable(host)) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  // Indexing is on, but canonicals/sitemap URLs come from NEXT_PUBLIC_SITE_URL:
  // if it still points elsewhere the live site would advertise the wrong origin.
  if (new URL(siteUrl()).origin !== PRODUCTION_ORIGIN) {
    console.warn(
      `[seo] SITE_INDEXABLE=true but NEXT_PUBLIC_SITE_URL is ${siteUrl()}, expected ${PRODUCTION_ORIGIN}. ` +
        "Canonicals, sitemap and email links will use the wrong origin.",
    );
  }

  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/preview"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
