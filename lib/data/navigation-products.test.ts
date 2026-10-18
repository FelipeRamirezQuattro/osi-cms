import { beforeEach, describe, expect, it, vi } from "vitest";
import { getNavMenu } from "@/lib/data/navigation";

/**
 * getNavMenu resolves product-referencing items by identity (nav_items.product_id,
 * 0048): href is rebuilt from the product's current category + slug, and the item
 * disappears while the product isn't published (or has no category).
 */
const { mockCreateServerDbClient } = vi.hoisted(() => ({ mockCreateServerDbClient: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ createServerDbClient: mockCreateServerDbClient }));
vi.mock("@/lib/data/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("@/lib/data/pages", () => ({ listAllPages: vi.fn() }));

const { mockListPublished } = vi.hoisted(() => ({ mockListPublished: vi.fn() }));
vi.mock("@/lib/data/products", () => ({
  listProductsWithCategorySlug: mockListPublished,
  listAllProductsWithCategorySlug: vi.fn(),
}));

function fakeDb(items: unknown[]) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order"]) chain[m] = () => chain;
  let call = 0;
  chain.maybeSingle = async () => ({ data: { id: "menu-1" }, error: null });
  chain.then = (resolve: (v: unknown) => void) => {
    call += 1;
    resolve({ data: items, error: null });
  };
  void call;
  return { from: () => chain };
}

const row = (over: Record<string, unknown>) => ({
  menu_id: "menu-1",
  parent_id: null,
  badge: null,
  is_external: false,
  position: 0,
  product_id: null,
  created_at: "",
  updated_at: "",
  ...over,
});

const column = row({ id: "col", label: "Sand Control", href: "#" });
const product = (id: string, slug: string, categorySlug: string | null) => ({ id, slug, categorySlug });

beforeEach(() => {
  mockCreateServerDbClient.mockReset();
  mockListPublished.mockReset();
});

describe("getNavMenu(mega) with product references", () => {
  it("builds the href from the product's current category, ignoring a stale stored href", async () => {
    mockCreateServerDbClient.mockReturnValue(
      fakeDb([column, row({ id: "a", parent_id: "col", label: "The Nozzle", href: "/products/gas-separation/the-nozzle", product_id: "p1" })]),
    );
    mockListPublished.mockResolvedValue([product("p1", "the-nozzle", "sand-control")]);

    const [col] = await getNavMenu("mega");
    expect(col.children.map((c) => [c.label, c.href])).toEqual([["The Nozzle", "/products/sand-control/the-nozzle"]]);
  });

  it("hides an item whose product is not published, and shows it once it is", async () => {
    const items = [column, row({ id: "a", parent_id: "col", label: "Super Perf", href: "/x", product_id: "p2" })];
    mockCreateServerDbClient.mockReturnValue(fakeDb(items));

    mockListPublished.mockResolvedValue([]); // draft: not in the published list
    expect((await getNavMenu("mega"))[0].children).toHaveLength(0);

    mockListPublished.mockResolvedValue([product("p2", "super-perf", "sand-control")]); // published
    expect((await getNavMenu("mega"))[0].children.map((c) => c.href)).toEqual(["/products/sand-control/super-perf"]);
  });

  it("hides a published product that has no category (no URL can be built)", async () => {
    mockCreateServerDbClient.mockReturnValue(
      fakeDb([column, row({ id: "a", parent_id: "col", label: "Dip Tube Bypass", href: "/x", product_id: "p3" })]),
    );
    mockListPublished.mockResolvedValue([product("p3", "osi-top-intake-bypass", null)]);
    expect((await getNavMenu("mega"))[0].children).toHaveLength(0);
  });

  it("leaves plain links alone and still drops a typed /products href that would 404", async () => {
    mockCreateServerDbClient.mockReturnValue(
      fakeDb([
        column,
        row({ id: "a", parent_id: "col", label: "About Us", href: "/about-us" }),
        row({ id: "b", parent_id: "col", label: "Typo", href: "/products/sand-control/nope" }),
        row({ id: "c", parent_id: "col", label: "Real", href: "/products/sand-control/real" }),
      ]),
    );
    mockListPublished.mockResolvedValue([product("p4", "real", "sand-control")]);
    expect((await getNavMenu("mega"))[0].children.map((c) => c.label)).toEqual(["About Us", "Real"]);
  });
});

describe("getNavMenu(non-mega)", () => {
  it("does not query products when no item references one", async () => {
    mockCreateServerDbClient.mockReturnValue(fakeDb([row({ id: "a", label: "Careers", href: "/careers" })]));
    const menu = await getNavMenu("utility");
    expect(menu.map((m) => m.href)).toEqual(["/careers"]);
    expect(mockListPublished).not.toHaveBeenCalled();
  });

  it("resolves product references in any menu (e.g. a footer column)", async () => {
    mockCreateServerDbClient.mockReturnValue(fakeDb([row({ id: "a", label: "SRP", href: "/old", product_id: "p5" })]));
    mockListPublished.mockResolvedValue([product("p5", "srp-sand-lift", "sand-control")]);
    expect((await getNavMenu("footer-1")).map((m) => m.href)).toEqual(["/products/sand-control/srp-sand-lift"]);
  });
});
