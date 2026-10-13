import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/pages",
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

import { useListQueryState } from "@/components/admin/ui/use-list-query-state";

let replaceState: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  window.history.replaceState(null, "", "/admin/pages");
  replaceState = vi.spyOn(window.history, "replaceState");
});
afterEach(() => replaceState.mockRestore());

describe("useListQueryState writes", () => {
  it("passes null as the history state so Next syncs useSearchParams (a state with Next's __NA marker is NOT synced — lists stopped filtering in production)", () => {
    // Simulate the entry Next itself creates: it carries __NA.
    window.history.replaceState({ __NA: true }, "", "/admin/pages");
    replaceState.mockClear();
    const { result } = renderHook(() => useListQueryState());
    act(() => result.current.setQuery("sand"));
    expect(replaceState).toHaveBeenCalledTimes(1);
    const [data, , url] = replaceState.mock.calls[0];
    expect(data).toBeNull();
    expect(url).toBe("/admin/pages?q=sand");
  });

  it("resets the page when the search changes and merges with existing params", () => {
    window.history.replaceState(null, "", "/admin/pages?status=draft&page=3");
    replaceState.mockClear();
    const { result } = renderHook(() => useListQueryState());
    act(() => result.current.setQuery("x"));
    const url = new URL(String(replaceState.mock.calls[0][2]), "http://localhost");
    expect(url.searchParams.get("q")).toBe("x");
    expect(url.searchParams.get("status")).toBe("draft");
    expect(url.searchParams.has("page")).toBe(false);
  });
});
