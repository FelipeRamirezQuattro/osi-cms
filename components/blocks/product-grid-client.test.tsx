import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ProductGridClient } from "@/components/blocks/product-grid-client";
import { applicationHref, industryHref, productHref } from "@/lib/routes";
import type { ProductWithCategorySlug } from "@/lib/data/products";
import type { Tables } from "@/lib/db/database.types";

/**
 * Covers the plan's broken-link bullet: "product grid ... must generate
 * /products/{category}/{slug}". ProductGridClient is the component that
 * actually builds every tab's hrefs (lib/routes.test.ts only unit-tests
 * the pure href-builder functions, never that this component calls them),
 * so this renders it with fixture data shaped like real seeded rows and
 * asserts every rendered link's href matches what lib/routes.ts's helpers
 * produce for that same row — across all four tabs.
 *
 * Discovery cards expose their title and teaser immediately and the full
 * card is one link, so every route can be asserted without interaction.
 */

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

function cardHref(title: string): string | null {
  return screen.getByRole("link", { name: new RegExp(title, "i") }).getAttribute("href");
}

const products = [
  { id: "p1", slug: "gas-release-system", name: "Gas Release System", summary: "s1", categorySlug: "gas-separation" },
  { id: "p2", slug: "esp-chem-screen", name: "ESP Chem Screen", summary: "s2", categorySlug: "pumps" },
] as unknown as ProductWithCategorySlug[];

const categories = [
  { id: "c1", slug: "gas-separation", name: "Gas Separation" },
  { id: "c2", slug: "pumps", name: "Pumps" },
] as unknown as Tables<"product_categories">[];

const industries = [
  { id: "i1", slug: "oil-gas", name: "Oil & Gas", description: null },
  { id: "i2", slug: "mining", name: "Mining", description: null },
] as unknown as Tables<"industries">[];

const applications = [
  { id: "a1", slug: "artificial-lift", name: "Artificial Lift", description: null },
] as unknown as Tables<"applications">[];

const services = [{ title: "Machine Shop", body: undefined, href: "/services/machine-shop" }];

function renderGrid() {
  return render(
    <ProductGridClient
      products={products}
      categories={categories}
      industries={industries}
      applications={applications}
      services={services}
    />,
  );
}

describe("ProductGridClient generates routes via lib/routes.ts helpers", () => {
  it("products tab: every item's link is productHref(categorySlug, slug)", () => {
    renderGrid();

    expect(cardHref(products[0].name)).toBe(productHref(products[0].categorySlug!, products[0].slug));
    expect(cardHref(products[1].name)).toBe(productHref(products[1].categorySlug!, products[1].slug));
  });

  it("industries tab: every item's link is industryHref(slug)", () => {
    renderGrid();
    fireEvent.click(screen.getByRole("button", { name: "Industries" }));

    expect(cardHref(industries[0].name)).toBe(industryHref(industries[0].slug));
    expect(cardHref(industries[1].name)).toBe(industryHref(industries[1].slug));
  });

  it("applications tab: every item's link is applicationHref(slug)", () => {
    renderGrid();
    fireEvent.click(screen.getByRole("button", { name: "Applications" }));

    expect(cardHref(applications[0].name)).toBe(applicationHref(applications[0].slug));
  });

  it("services tab: links are real CMS page hrefs (not the unused services table)", () => {
    renderGrid();
    fireEvent.click(screen.getByRole("button", { name: "Services" }));

    expect(cardHref(services[0].title)).toBe("/services/machine-shop");
  });

  it("falls back to /products (never a dead link) when a product has no resolved category slug", () => {
    const orphan = [
      { id: "p3", slug: "orphan", name: "Orphan Product", summary: null, categorySlug: null },
    ] as unknown as ProductWithCategorySlug[];

    render(
      <ProductGridClient
        products={orphan}
        categories={categories}
        industries={industries}
        applications={applications}
        services={services}
      />,
    );

    expect(cardHref(orphan[0].name)).toBe("/products");
  });

  it("stores view and category filters in readable URL parameters", () => {
    renderGrid();

    fireEvent.click(screen.getByRole("button", { name: "Industries" }));
    expect(new URLSearchParams(window.location.search).get("view")).toBe("industries");

    fireEvent.click(screen.getByRole("button", { name: "Products" }));
    fireEvent.click(screen.getByRole("button", { name: "Gas Separation" }));
    expect(new URLSearchParams(window.location.search).get("category")).toBe("gas-separation");
    expect(screen.getByText("1 result")).toBeTruthy();
  });
});
