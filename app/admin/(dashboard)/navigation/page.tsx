import Link from "next/link";
import { getMenuItemsAction } from "@/lib/actions/navigation";
import type { NavMenuKey } from "@/lib/actions/navigation";
import { NavEditor } from "@/app/admin/(dashboard)/navigation/nav-editor";

export const dynamic = "force-dynamic";

const MENU_KEYS: NavMenuKey[] = ["primary", "mega", "utility", "footer-1", "footer-2", "footer-3", "footer-4"];

export default async function NavigationPage({
  searchParams,
}: PageProps<"/admin/navigation">) {
  const params = await searchParams;
  const raw = typeof params.menu === "string" ? params.menu : "primary";
  const key = (MENU_KEYS.includes(raw as NavMenuKey) ? raw : "primary") as NavMenuKey;

  const { menu, items } = await getMenuItemsAction(key);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-lg tracking-wide-display uppercase">Navigation</h1>

      <div className="flex flex-wrap gap-2 border-b border-osi-sand-300 pb-3">
        {MENU_KEYS.map((k) => (
          <Link
            key={k}
            href={`/admin/navigation?menu=${k}`}
            className={
              k === key
                ? "rounded bg-osi-navy-900 px-3 py-1.5 text-xs uppercase tracking-wide-label text-osi-white"
                : "rounded border border-osi-sand-300 px-3 py-1.5 text-xs uppercase tracking-wide-label"
            }
          >
            {k}
          </Link>
        ))}
      </div>

      <NavEditor menuId={menu.id} items={items} />
    </div>
  );
}
