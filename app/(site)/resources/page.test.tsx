import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { listResources } = vi.hoisted(() => ({ listResources: vi.fn() }));
vi.mock("@/lib/data/resources", () => ({ listResources }));
vi.mock("@/lib/data/products", () => ({ listProducts: vi.fn().mockResolvedValue([]) }));
vi.mock("@/app/(site)/resources/resources-filter-client", () => ({
  ResourcesFilterClient: () => <div data-testid="filter" />,
}));

import ResourcesPage from "./page";

describe("/resources", () => {
  it("explains the empty library and links to products and contact when nothing is published", async () => {
    listResources.mockResolvedValue([]);
    render(await ResourcesPage());
    expect(screen.getByText("The resource library is being prepared")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Explore products/ }).getAttribute("href")).toBe("/products");
    expect(screen.getByRole("link", { name: /Contact OSI/ }).getAttribute("href")).toBe("/contact");
    expect(screen.queryByTestId("filter")).toBeNull();
  });

  it("shows the filterable list once a resource is published", async () => {
    listResources.mockResolvedValue([
      { id: "r1", title: "Brochure", kind: "brochure", category: null, file_url: "https://x/y.pdf", product_id: null },
    ]);
    render(await ResourcesPage());
    expect(screen.getByTestId("filter")).toBeTruthy();
  });
});
