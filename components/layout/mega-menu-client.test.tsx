import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MegaMenuClient } from "@/components/layout/mega-menu-client";
import type { NavItemNode } from "@/lib/data/navigation";

/**
 * The utility and mega-menu links remain in the initial dialog DOM even
 * while the native dialog is closed, and both need to honor is_external
 * the same way footer.tsx does.
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

  it("exposes labeled search/menu triggers and native dialog semantics", () => {
    const container = render([]);
    const searchTrigger = container.querySelector('button[aria-label="Search"]');
    const menuTrigger = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Menu"));
    const menuDialog = container.querySelector("#mega-menu-panel");

    expect(searchTrigger?.getAttribute("aria-haspopup")).toBe("dialog");
    expect(menuTrigger?.getAttribute("aria-haspopup")).toBe("dialog");
    expect(menuDialog?.tagName).toBe("DIALOG");
    expect(menuDialog?.getAttribute("aria-labelledby")).toBe("site-menu-title");
  });
});
