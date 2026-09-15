import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ResourceListClient, type ResourceListItem } from "@/components/blocks/resource-list-client";

afterEach(cleanup);

const resources: ResourceListItem[] = [
  { id: "r1", title: "Gas Release Brochure", kind: "brochure", category: "Gas", fileUrl: "/a.pdf", productName: "Gas Release System" },
  { id: "r2", title: "ESP Chem Datasheet", kind: "datasheet", category: "ESP", fileUrl: "/b.pdf", productName: "ESP Chem Screen" },
];

describe("ResourceListClient", () => {
  it("renders the configured empty-state message and no filter controls when there are 0 resources", () => {
    render(<ResourceListClient resources={[]} emptyStateMessage="Nothing published yet." />);
    expect(screen.getByText("Nothing published yet.")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("lists every resource with a working download link by default", () => {
    render(<ResourceListClient resources={resources} emptyStateMessage="Nothing yet." />);
    expect(screen.getByText("Gas Release Brochure")).toBeInTheDocument();
    expect(screen.getByText("ESP Chem Datasheet")).toBeInTheDocument();
    const links = screen.getAllByRole("link", { name: "Download" });
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/a.pdf", "/b.pdf"]);
  });

  it("filters by kind", () => {
    render(<ResourceListClient resources={resources} emptyStateMessage="Nothing yet." />);
    fireEvent.change(screen.getByLabelText("Filter by type"), { target: { value: "datasheet" } });
    expect(screen.queryByText("Gas Release Brochure")).toBeNull();
    expect(screen.getByText("ESP Chem Datasheet")).toBeInTheDocument();
  });

  it("filters by product", () => {
    render(<ResourceListClient resources={resources} emptyStateMessage="Nothing yet." />);
    fireEvent.change(screen.getByLabelText("Filter by product"), { target: { value: "Gas Release System" } });
    expect(screen.getByText("Gas Release Brochure")).toBeInTheDocument();
    expect(screen.queryByText("ESP Chem Datasheet")).toBeNull();
  });

  it("shows a distinct 'no matches' message (not the block's empty-state message) when a filter combination matches nothing", () => {
    render(<ResourceListClient resources={resources} emptyStateMessage="Nothing published yet." />);
    // "brochure" kind + "ESP" category is a real option pair for each
    // dropdown individually, but no single resource has both.
    fireEvent.change(screen.getByLabelText("Filter by type"), { target: { value: "brochure" } });
    fireEvent.change(screen.getByLabelText("Filter by category"), { target: { value: "ESP" } });
    expect(screen.getByText("No resources match those filters.")).toBeInTheDocument();
    expect(screen.queryByText("Nothing published yet.")).toBeNull();
  });
});
