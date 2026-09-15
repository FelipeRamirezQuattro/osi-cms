import { describe, expect, it } from "vitest";
import { ADMIN_NAV_GROUPS, filterNavGroupsByRole } from "@/lib/admin/nav-config";

describe("filterNavGroupsByRole", () => {
  it("admin sees every item in every group", () => {
    const filtered = filterNavGroupsByRole(ADMIN_NAV_GROUPS, "admin");
    const originalCount = ADMIN_NAV_GROUPS.reduce((n, g) => n + g.items.length, 0);
    const filteredCount = filtered.reduce((n, g) => n + g.items.length, 0);
    expect(filteredCount).toBe(originalCount);
    expect(filtered.length).toBe(ADMIN_NAV_GROUPS.length);
  });

  it("editor never sees admin-only items (Users, Settings, Navigation, Audit log)", () => {
    const filtered = filterNavGroupsByRole(ADMIN_NAV_GROUPS, "editor");
    const hrefs = filtered.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).not.toContain("/admin/users");
    expect(hrefs).not.toContain("/admin/settings");
    expect(hrefs).not.toContain("/admin/navigation");
    expect(hrefs).not.toContain("/admin/audit-log");
  });

  it("editor still sees day-to-day content sections (Pages, Products, Media, Submissions)", () => {
    const filtered = filterNavGroupsByRole(ADMIN_NAV_GROUPS, "editor");
    const hrefs = filtered.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).toContain("/admin/pages");
    expect(hrefs).toContain("/admin/products");
    expect(hrefs).toContain("/admin/media");
    expect(hrefs).toContain("/admin/submissions");
  });

  it("drops a group entirely if every one of its items gets filtered out for the role", () => {
    const singleAdminOnlyGroup = [{ label: "Admin-only", items: [{ href: "/admin/users", label: "Users", capability: "manage_users" as const }] }];
    expect(filterNavGroupsByRole(singleAdminOnlyGroup, "editor")).toEqual([]);
    expect(filterNavGroupsByRole(singleAdminOnlyGroup, "admin")).toHaveLength(1);
  });

  it("every href in the real config is unique (a duplicate would silently double-render in the sidebar)", () => {
    const hrefs = ADMIN_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href));
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
