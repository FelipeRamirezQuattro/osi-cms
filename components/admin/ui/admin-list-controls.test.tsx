import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { AdminListControls } from "@/components/admin/ui/admin-list-controls";

describe("AdminListControls", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("debounces the search input before calling onSearchChange", () => {
    const onSearchChange = vi.fn();
    render(
      <AdminListControls
        searchValue=""
        onSearchChange={onSearchChange}
        page={1}
        totalPages={1}
        onPageChange={() => {}}
        resultCount={5}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Search…"), { target: { value: "gas release" } });
    expect(onSearchChange).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(249));
    expect(onSearchChange).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(10));
    expect(onSearchChange).toHaveBeenCalledWith("gas release");
    expect(onSearchChange).toHaveBeenCalledTimes(1);
  });

  it("calls onStatusChange immediately (no debounce) when a status filter is chosen", () => {
    const onStatusChange = vi.fn();
    render(
      <AdminListControls
        searchValue=""
        onSearchChange={() => {}}
        statusValue=""
        onStatusChange={onStatusChange}
        statusOptions={["draft", "published"]}
        page={1}
        totalPages={1}
        onPageChange={() => {}}
        resultCount={5}
      />,
    );

    fireEvent.change(screen.getByDisplayValue("All statuses"), { target: { value: "draft" } });
    expect(onStatusChange).toHaveBeenCalledWith("draft");
  });

  it("splits the compound sort option value/direction on change", () => {
    const onSortChange = vi.fn();
    render(
      <AdminListControls
        searchValue=""
        onSearchChange={() => {}}
        sortValue="title"
        sortDirection="asc"
        onSortChange={onSortChange}
        sortOptions={[
          { value: "title", label: "Title A-Z", direction: "asc" },
          { value: "title", label: "Title Z-A", direction: "desc" },
        ]}
        page={1}
        totalPages={1}
        onPageChange={() => {}}
        resultCount={5}
      />,
    );

    fireEvent.change(screen.getByDisplayValue("Title A-Z"), { target: { value: "title:desc" } });
    expect(onSortChange).toHaveBeenCalledWith("title", "desc");
  });

  it("disables Prev on the first page and Next on the last page", () => {
    const onPageChange = vi.fn();
    render(
      <AdminListControls
        searchValue=""
        onSearchChange={() => {}}
        page={1}
        totalPages={3}
        onPageChange={onPageChange}
        resultCount={50}
      />,
    );

    expect(screen.getByText("Prev")).toBeDisabled();
    expect(screen.getByText("Next")).not.toBeDisabled();

    fireEvent.click(screen.getByText("Next"));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("hides pagination controls entirely when there is only one page", () => {
    render(
      <AdminListControls searchValue="" onSearchChange={() => {}} page={1} totalPages={1} onPageChange={() => {}} resultCount={3} />,
    );
    expect(screen.queryByText("Prev")).not.toBeInTheDocument();
  });
});
