import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getSitemapEntries } from "@/lib/data/sitemap";
import { isSiteIndexable } from "@/lib/indexing";
import { siteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  // The review site advertises nothing: an empty sitemap, matching its robots.txt.
  if (!isSiteIndexable(host)) return [];

  const entries = await getSitemapEntries();
  const base = siteUrl();
  return entries.map((entry) => ({ url: `${base}${entry.url}`, lastModified: entry.lastModified }));
}
