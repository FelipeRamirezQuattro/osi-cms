import type { BrandingConfig } from "@/lib/branding/schema";

export type BrandTokenUsage = {
  source: "branding" | "page_block" | "shared_section_block" | "page_publication" | "shared_section_publication" | "history";
  id: string;
  label: string;
  blocking: boolean;
};

export function jsonReferencesBrandToken(value: unknown, tokenId: string): boolean {
  if (typeof value === "string") return value === tokenId;
  if (Array.isArray(value)) return value.some((item) => jsonReferencesBrandToken(item, tokenId));
  if (value && typeof value === "object") return Object.values(value).some((item) => jsonReferencesBrandToken(item, tokenId));
  return false;
}

/** A swatch's own declaration is not a usage; only mappings/defaults are. */
export function configReferencesBrandToken(config: BrandingConfig, tokenId: string): boolean {
  return jsonReferencesBrandToken({ roles: config.roles, surfacePresets: config.surfacePresets, blockDefaults: config.blockDefaults }, tokenId);
}
