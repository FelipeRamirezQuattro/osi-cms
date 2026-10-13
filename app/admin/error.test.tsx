import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminAuthError from "./error";

afterEach(cleanup);

describe("admin auth error boundary (ACC-01)", () => {
  it("offers a full reload and a way back to sign-in", () => {
    const reload = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});
    Object.defineProperty(window, "location", { value: { ...window.location, reload }, writable: true });
    render(<AdminAuthError error={new Error("Failed to find Server Action")} />);
    fireEvent.click(screen.getByRole("button", { name: "Reload" }));
    expect(reload).toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/admin/login");
  });
});
