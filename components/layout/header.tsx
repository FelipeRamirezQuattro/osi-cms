import Link from "next/link";
import { getNavMenu } from "@/lib/data/navigation";
import { MegaMenuClient } from "@/components/layout/mega-menu-client";

export async function Header() {
  const [utilityItems, megaColumns] = await Promise.all([
    getNavMenu("utility"),
    getNavMenu("mega"),
  ]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-osi-navy-900/94 px-5 text-osi-white shadow-[0_12px_35px_rgba(0,11,22,0.14)] backdrop-blur-xl md:px-10">
      <div className="mx-auto flex min-h-18 max-w-[var(--site-container)] items-center justify-between gap-8">
        <Link
          href="/"
          aria-label="OSI home"
          className="inline-flex min-h-11 items-center font-display text-xl font-bold tracking-wide-display uppercase"
        >
          OSI<span className="ml-1 text-osi-gold-500">.</span>
        </Link>
        <MegaMenuClient utilityItems={utilityItems} megaColumns={megaColumns} />
      </div>
    </header>
  );
}
