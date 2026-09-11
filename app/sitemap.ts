import type { MetadataRoute } from "next";
import { getSitemapEntries } from "@/lib/data/sitemap";
import { siteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await getSitemapEntries();
  const base = siteUrl();
  return entries.map((entry) => ({ url: `${base}${entry.url}`, lastModified: entry.lastModified }));
}
