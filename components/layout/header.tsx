import Link from "next/link";
import { getNavMenu } from "@/lib/data/navigation";
import { MegaMenuClient } from "@/components/layout/mega-menu-client";

export async function Header() {
  const [utilityItems, megaColumns] = await Promise.all([
    getNavMenu("utility"),
    getNavMenu("mega"),
  ]);

  return (
    <header className="relative z-40 border-b border-osi-steel-500/20 bg-osi-navy-900 px-6 py-4 text-osi-white md:px-12">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/" className="font-display text-xl tracking-wide-display uppercase">
          OSI
        </Link>
        <MegaMenuClient utilityItems={utilityItems} megaColumns={megaColumns} />
      </div>
    </header>
  );
}
