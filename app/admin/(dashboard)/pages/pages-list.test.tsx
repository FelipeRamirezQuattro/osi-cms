import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PagesList } from "@/app/admin/(dashboard)/pages/pages-list";

vi.mock("@/components/admin/ui/use-list-query-state", () => ({
  useListQueryState: () => ({
    q: "",
    status: "",
    sort: "",
    direction: "asc",
    page: 1,
    setQuery: vi.fn(),
    setStatus: vi.fn(),
    setSort: vi.fn(),
    setPage: vi.fn(),
  }),
}));

afterEach(cleanup);

describe("PagesList", () => {
  it("uses a consistent wrapping treatment for long page titles", () => {
    const pages = [
      {
        id: "page-1",
        title: "Gas separator — systems for oil treatment and other industrial applications",
        slug: "gas-separator",
        template: "standard",
        status: "published",
        is_system: false,
        updated_at: "2026-09-23T12:00:00Z",
      },
    ] as React.ComponentProps<typeof PagesList>["pages"];

    render(<PagesList pages={pages} />);

    expect(screen.getByRole("link", { name: pages[0].title })).toHaveClass("admin-page-title-link");
  });
});
