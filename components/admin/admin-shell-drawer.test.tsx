import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AdminShell } from "@/components/admin/admin-shell";
import type { AdminNavGroup } from "@/lib/admin/nav-config";

/**
 * Task 14 review fix: the mobile drawer's <dialog> stays modal (top
 * layer, rest of the document marked inert) purely because of
 * showModal() — that has nothing to do with `lg:hidden` making it
 * invisible above the `lg` breakpoint. Rotating a tablet from portrait to
 * landscape while the drawer is open previously left the whole admin
 * invisible-but-inert. This confirms crossing that breakpoint while open
 * actually calls close() on the dialog.
 */
vi.mock("next/navigation", () => ({ usePathname: () => "/admin" }));

const groups: AdminNavGroup[] = [
  { label: "Overview", items: [{ href: "/admin", label: "Dashboard", capability: null }] },
];

let matchMediaListeners: Array<(event: MediaQueryListEvent) => void> = [];

beforeEach(() => {
  matchMediaListeners = [];
  // jsdom doesn't implement <dialog>'s showModal/close.
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => {
        matchMediaListeners.push(listener);
      },
      removeEventListener: () => {},
    })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  cleanup();
});

describe("AdminShell mobile drawer", () => {
  it("closes the modal drawer when the viewport crosses into the desktop breakpoint while it's open", () => {
    render(
      <AdminShell groups={groups} session={{ email: "a@b.com", role: "admin" }} signOut={<button>Sign out</button>}>
        <div>content</div>
      </AdminShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute("aria-expanded", "true");

    act(() => {
      matchMediaListeners.forEach((listener) => listener({ matches: true } as MediaQueryListEvent));
    });

    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute("aria-expanded", "false");
  });
});
