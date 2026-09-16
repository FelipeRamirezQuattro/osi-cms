import Link from "next/link";
import { getNavMenu } from "@/lib/data/navigation";
import { MegaMenuClient } from "@/components/layout/mega-menu-client";
import { BrandLogo } from "@/components/branding/brand-logo";
import type { BrandingConfig } from "@/lib/branding/schema";
import type { MediaAsset } from "@/lib/data/media";
import { OSI_SEED_BRANDING_CONFIG } from "@/lib/branding/seed";

export async function Header({ branding = OSI_SEED_BRANDING_CONFIG, logoAsset = null }: { branding?: BrandingConfig; logoAsset?: MediaAsset | null } = {}) {
  const [utilityItems, megaColumns] = await Promise.all([
    getNavMenu("utility"),
    getNavMenu("mega"),
  ]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-brand-surface-dark/94 px-5 text-brand-text-dark shadow-[0_12px_35px_rgba(0,11,22,0.14)] backdrop-blur-xl md:px-10">
      <div className="mx-auto flex min-h-18 max-w-[var(--site-container)] items-center justify-between gap-8">
        <Link
          href="/"
          aria-label="OSI home"
          className="inline-flex min-h-11 items-center font-display text-xl font-bold tracking-wide-display uppercase"
        >
          <BrandLogo config={branding} asset={logoAsset} />
        </Link>
        <MegaMenuClient utilityItems={utilityItems} megaColumns={megaColumns} brandLogo={<BrandLogo config={branding} asset={logoAsset} />} />
      </div>
    </header>
  );
}
