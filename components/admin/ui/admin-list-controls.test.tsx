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

  it("reserves space for the search icon so it cannot overlap the entered text", () => {
    render(
      <AdminListControls
        searchValue=""
        onSearchChange={() => {}}
        page={1}
        totalPages={1}
        onPageChange={() => {}}
        resultCount={5}
      />,
    );

    expect(screen.getByPlaceholderText("Search…")).toHaveClass("admin-search-control");
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

  it("renders a selected 'Default order' option when no sort is applied", () => {
    render(
      <AdminListControls
        searchValue=""
        onSearchChange={() => {}}
        sortValue=""
        onSortChange={() => {}}
        sortOptions={[{ value: "title", label: "Title A-Z", direction: "asc" }]}
        page={1}
        totalPages={1}
        onPageChange={() => {}}
        resultCount={5}
      />,
    );

    expect(screen.getByDisplayValue("Default order")).toBeInTheDocument();
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

describe("AdminListControls search echo (ACC-07, MOD-01/02/03, RED-01)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  const baseProps = { page: 1, totalPages: 1, onPageChange: () => {}, resultCount: 1 };

  it("keeps every typed character when the URL echo of an older commit arrives late", () => {
    const onSearchChange = vi.fn();
    const { rerender } = render(
      <AdminListControls searchValue="" onSearchChange={onSearchChange} {...baseProps} />,
    );
    const input = screen.getByPlaceholderText("Search…") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "red" } });
    act(() => vi.advanceTimersByTime(260)); // commit #1: "red" (echo is delayed)
    fireEvent.change(input, { target: { value: "redirect" } });
    act(() => vi.advanceTimersByTime(260)); // commit #2: "redirect"
    expect(onSearchChange.mock.calls.map((c) => c[0])).toEqual(["red", "redirect"]);

    // Echoes arrive in order, late. Neither may overwrite the input.
    rerender(<AdminListControls searchValue="red" onSearchChange={onSearchChange} {...baseProps} />);
    expect(input.value).toBe("redirect");
    rerender(<AdminListControls searchValue="redirect" onSearchChange={onSearchChange} {...baseProps} />);
    expect(input.value).toBe("redirect");
  });

  it("keeps characters typed after a commit while its echo is still in flight", () => {
    const { rerender } = render(
      <AdminListControls searchValue="" onSearchChange={() => {}} {...baseProps} />,
    );
    const input = screen.getByPlaceholderText("Search…") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "red" } });
    act(() => vi.advanceTimersByTime(260));
    fireEvent.change(input, { target: { value: "redir" } }); // still debouncing
    rerender(<AdminListControls searchValue="red" onSearchChange={() => {}} {...baseProps} />);
    expect(input.value).toBe("redir");
  });

  it("still resyncs the input when the value changes from outside (Clear filters / Back)", () => {
    const { rerender } = render(
      <AdminListControls searchValue="gas" onSearchChange={() => {}} {...baseProps} />,
    );
    const input = screen.getByPlaceholderText("Search…") as HTMLInputElement;
    expect(input.value).toBe("gas");
    rerender(<AdminListControls searchValue="" onSearchChange={() => {}} {...baseProps} />);
    expect(input.value).toBe("");
  });
});
