import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MegaMenuClient } from "@/components/layout/mega-menu-client";
import type { NavItemNode } from "@/lib/data/navigation";

/**
 * Task 7 item #10, continued: the header's utility nav (always visible)
 * and mega-menu column links (mounted once `open` is true, but present in
 * this component's initial render tree since `open` starts false only
 * for the overlay — the utility row is what's actually always rendered)
 * both need to honor is_external the same way footer.tsx does.
 */

function navItem(overrides: Partial<NavItemNode>): NavItemNode {
  return {
    id: "n1",
    menu_id: "m1",
    parent_id: null,
    label: "Item",
    href: "/item",
    badge: null,
    is_external: false,
    position: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    children: [],
    ...overrides,
  };
}

function render(utilityItems: NavItemNode[], megaColumns: NavItemNode[] = []) {
  const html = renderToStaticMarkup(<MegaMenuClient utilityItems={utilityItems} megaColumns={megaColumns} />);
  const container = document.createElement("div");
  container.innerHTML = html;
  return container;
}

describe("MegaMenuClient utility nav honors is_external", () => {
  it("gives an external utility item target=_blank and a safe rel", () => {
    const container = render([
      navItem({ id: "ext", label: "Partner Portal", href: "https://partners.example.com", is_external: true }),
    ]);
    const link = [...container.querySelectorAll("a")].find((a) => a.textContent?.includes("Partner Portal"));
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("leaves an internal utility item with no target/rel", () => {
    const container = render([navItem({ id: "int", label: "Search", href: "/search", is_external: false })]);
    const link = [...container.querySelectorAll("a")].find((a) => a.textContent?.includes("Search"));
    expect(link?.getAttribute("target")).toBeNull();
    expect(link?.getAttribute("rel")).toBeNull();
  });
});
