import Image from "next/image";
import { resolveMediaUrl } from "@/lib/media";
import type { BrandingConfig } from "@/lib/branding/schema";
import type { MediaAsset } from "@/lib/data/media";

const SIZE_CLASSES = { sm: "h-6", md: "h-8", lg: "h-10" } as const;

export function BrandLogo({ config, asset, dark = true }: { config: BrandingConfig; asset: MediaAsset | null; dark?: boolean }) {
  if (!asset) {
    return <>OSI<span className={dark ? "text-brand-accent-dark" : "text-brand-accent-light"}>.</span></>;
  }
  return (
    <Image
      src={resolveMediaUrl(asset.url)}
      alt={config.logo.altText}
      width={asset.width ?? 180}
      height={asset.height ?? 48}
      className={`${SIZE_CLASSES[config.logo.headerSizePreset]} w-auto max-w-48 object-contain`}
    />
  );
}
