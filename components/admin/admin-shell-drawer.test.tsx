import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
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
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const groups: AdminNavGroup[] = [
  { label: "Overview", items: [{ href: "/admin", label: "Dashboard", capability: null }] },
];

let matchMediaListeners: Array<(event: MediaQueryListEvent) => void> = [];

beforeEach(() => {
  matchMediaListeners = [];
  window.localStorage.clear();
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
      <AdminShell
        groups={groups}
        session={{ email: "a@b.com", role: "admin" }}
        signOut={<button>Sign out</button>}
      >
        <div>content</div>
      </AdminShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    act(() => {
      matchMediaListeners.forEach((listener) => listener({ matches: true } as MediaQueryListEvent));
    });

    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("keeps navigation labels and sign out accessible when the desktop sidebar is collapsed", () => {
    render(
      <AdminShell
        groups={groups}
        session={{ email: "a@b.com", role: "admin" }}
        signOut={<button>Sign out</button>}
      >
        <div>content</div>
      </AdminShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));

    expect(screen.getAllByRole("link", { name: "Dashboard" })).not.toHaveLength(0);
    expect(screen.getAllByRole("button", { name: "Sign out" })).not.toHaveLength(0);
    expect(window.localStorage.getItem("osi-admin-sidebar-collapsed")).toBe("true");
  });
});
