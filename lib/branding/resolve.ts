import "server-only";

import { OSI_SEED_BRANDING_CONFIG } from "@/lib/branding/seed";
import type { BrandingConfig } from "@/lib/branding/schema";
import { getBrandingDraft, getPublishedBranding } from "@/lib/data/branding";

export type ResolvedPublicBranding = {
  config: BrandingConfig;
  source: "published" | "draft" | "fallback";
  publishedVersion: number | null;
};

/**
 * Resolves only the public publication. Draft/history tables are never read
 * on a public route. Database absence, network failure, or malformed stored
 * data all fail closed to the code-owned OSI configuration.
 */
export async function resolvePublishedBranding(): Promise<ResolvedPublicBranding> {
  try {
    const publication = await getPublishedBranding();
    if (publication) {
      return {
        config: publication.config,
        source: "published",
        publishedVersion: publication.published_version,
      };
    }
  } catch (error) {
    console.error(
      "[branding] Published branding could not be resolved; using the built-in fallback.",
      error,
    );
  }

  return {
    config: OSI_SEED_BRANDING_CONFIG,
    source: "fallback",
    publishedVersion: null,
  };
}

/** Admin-authenticated preview equivalent. It is never called by a normal public request. */
export async function resolveDraftBranding(): Promise<ResolvedPublicBranding> {
  try {
    const draft = await getBrandingDraft();
    return { config: draft.config, source: "draft", publishedVersion: draft.draft_version };
  } catch (error) {
    console.error("[branding] Draft branding could not be resolved; using the public publication.", error);
    return resolvePublishedBranding();
  }
}
