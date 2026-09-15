import { describe, expect, it } from "vitest";
import { buildBreadcrumbs } from "@/components/admin/admin-shell";
import type { AdminNavGroup } from "@/lib/admin/nav-config";

const groups: AdminNavGroup[] = [
  { label: "Overview", items: [{ href: "/admin", label: "Dashboard", capability: null }] },
  { label: "Content", items: [{ href: "/admin/pages", label: "Pages", capability: "edit_drafts" }] },
];

describe("buildBreadcrumbs", () => {
  it("is just Admin on the dashboard", () => {
    expect(buildBreadcrumbs("/admin", groups)).toEqual([{ label: "Admin", href: "/admin" }]);
  });

  it("resolves the section label for a list screen", () => {
    expect(buildBreadcrumbs("/admin/pages", groups)).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Pages", href: "/admin/pages" },
    ]);
  });

  it("labels a /new route as New", () => {
    expect(buildBreadcrumbs("/admin/pages/new", groups)).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Pages", href: "/admin/pages" },
      { label: "New", href: "/admin/pages/new" },
    ]);
  });

  it("labels any other detail segment as Edit", () => {
    expect(buildBreadcrumbs("/admin/pages/abc-123", groups)).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Pages", href: "/admin/pages" },
      { label: "Edit", href: "/admin/pages/abc-123" },
    ]);
  });

  it("falls back gracefully when a section has no matching nav item", () => {
    expect(buildBreadcrumbs("/admin/unknown-section", groups)).toEqual([{ label: "Admin", href: "/admin" }]);
  });
});
