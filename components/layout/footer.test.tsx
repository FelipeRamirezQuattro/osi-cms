import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Footer } from "@/components/layout/footer";
import type { NavItemNode } from "@/lib/data/navigation";

/**
 * Task 7 item #10: nav_items.is_external was captured by the admin form
 * and saved to the DB, but never read on the public side — every footer/
 * header link rendered as a plain internal `<Link>` regardless. This
 * covers the footer's rendering directly (mega-menu-client.tsx is
 * covered separately) by mocking getNavMenu/getSiteSettings.
 */

const { mockGetNavMenu } = vi.hoisted(() => ({ mockGetNavMenu: vi.fn() }));
vi.mock("@/lib/data/navigation", () => ({ getNavMenu: mockGetNavMenu }));

const { mockGetSiteSettings } = vi.hoisted(() => ({ mockGetSiteSettings: vi.fn() }));
vi.mock("@/lib/data/settings", () => ({ getSiteSettings: mockGetSiteSettings }));

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
    product_id: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    children: [],
    ...overrides,
  };
}

beforeEach(() => {
  mockGetNavMenu.mockReset();
  mockGetSiteSettings.mockReset().mockResolvedValue({
    phone: null,
    address_lines: [],
    social_facebook: null,
    social_linkedin: null,
    social_youtube: null,
    social_instagram: null,
  });
});

describe("Footer nav links honor is_external", () => {
  it("gives an external item target=_blank, a safe rel, and a visual indicator", async () => {
    mockGetNavMenu.mockImplementation(async (key: string) =>
      key === "footer-1"
        ? [navItem({ id: "ext", label: "Distributor Portal", href: "https://partners.example.com", is_external: true })]
        : [],
    );

    const html = renderToStaticMarkup(await Footer());
    const container = document.createElement("div");
    container.innerHTML = html;
    const link = [...container.querySelectorAll("a")].find((a) => a.textContent?.includes("Distributor Portal"));

    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("leaves an internal item with no target/rel", async () => {
    mockGetNavMenu.mockImplementation(async (key: string) =>
      key === "footer-1" ? [navItem({ id: "int", label: "About", href: "/about", is_external: false })] : [],
    );

    const html = renderToStaticMarkup(await Footer());
    const container = document.createElement("div");
    container.innerHTML = html;
    const link = [...container.querySelectorAll("a")].find((a) => a.textContent?.includes("About"));

    expect(link?.getAttribute("target")).toBeNull();
    expect(link?.getAttribute("rel")).toBeNull();
  });
});

describe("Footer extras (site_settings.footer_utility_links / footer_badges)", () => {
  const render = async (extra: Record<string, unknown>) => {
    mockGetNavMenu.mockResolvedValue([]);
    mockGetSiteSettings.mockResolvedValue({ phone: null, address_lines: [], social_facebook: null, social_linkedin: null, social_youtube: null, social_instagram: null, ...extra });
    const container = document.createElement("div");
    container.innerHTML = renderToStaticMarkup(await Footer());
    return container;
  };

  it("renders nothing for empty or missing settings", async () => {
    expect((await render({ footer_utility_links: [], footer_badges: [] })).querySelector("[data-footer-extras]")).toBeNull();
    expect((await render({})).querySelector("[data-footer-extras]")).toBeNull();
  });

  it("renders links (external ones in a new tab) and badges with alt text; a linked badge is one named link", async () => {
    const c = await render({
      footer_utility_links: [
        { label: "SG-SST Policies", href: "/hse/sg-sst-policies" },
        { label: "E-learning", href: "https://learning.example.com/" },
      ],
      footer_badges: [
        { imageUrl: "https://x.supabase.co/storage/v1/object/public/media/a.jpg", alt: "ISO 9001", href: null },
        { imageUrl: "https://x.supabase.co/storage/v1/object/public/media/b.jpg", alt: "ISO 45001 by SGS", href: "https://www.sgs.com/es-co" },
      ],
    });
    const links = c.querySelector("ul[aria-label='Footer links']")!;
    expect(links.textContent).toContain("SG-SST Policies");
    expect(links.querySelector("a[href='/hse/sg-sst-policies']")?.getAttribute("target")).toBeNull();
    expect(links.querySelector("a[href^='https://learning']")?.getAttribute("target")).toBe("_blank");
    const badges = c.querySelectorAll("ul[aria-label='Certifications'] li");
    expect(badges).toHaveLength(2);
    expect([...badges].map((li) => li.querySelector("img")?.getAttribute("alt"))).toEqual(["ISO 9001", "ISO 45001 by SGS"]);
    expect(badges[0].querySelector("a")).toBeNull();
    expect(badges[1].querySelector("a")?.getAttribute("href")).toBe("https://www.sgs.com/es-co");
  });

  it("skips malformed entries instead of rendering broken ones", async () => {
    const c = await render({ footer_utility_links: [{ label: "", href: "/x" }, { label: "Ok", href: "/ok" }, "junk"], footer_badges: [{ imageUrl: "", alt: "" }] });
    expect(c.querySelectorAll("ul[aria-label='Footer links'] li")).toHaveLength(1);
    expect(c.querySelector("ul[aria-label='Certifications']")).toBeNull();
  });
});
