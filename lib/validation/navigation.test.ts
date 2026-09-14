import { describe, expect, it } from "vitest";
import { navItemCreateSchema, navItemUpdateSchema } from "@/lib/validation/navigation";

describe("navItemCreateSchema", () => {
  it("accepts a well-formed nav item", () => {
    const result = navItemCreateSchema.safeParse({
      menu_id: "menu-1",
      parent_id: null,
      label: "Products",
      href: "/products",
      is_external: false,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.badge).toBeNull();
  });

  it("rejects a blank label", () => {
    expect(
      navItemCreateSchema.safeParse({ menu_id: "menu-1", parent_id: null, label: "", href: "/products", is_external: false })
        .success,
    ).toBe(false);
  });

  it("rejects an unsafe href and accepts mailto:/anchor links", () => {
    const base = { menu_id: "menu-1", parent_id: null, label: "Contact", is_external: false };
    expect(navItemCreateSchema.safeParse({ ...base, href: "javascript:alert(1)" }).success).toBe(false);
    expect(navItemCreateSchema.safeParse({ ...base, href: "mailto:hello@osi.example" }).success).toBe(true);
    expect(navItemCreateSchema.safeParse({ ...base, href: "#details" }).success).toBe(true);
  });
});

describe("navItemUpdateSchema", () => {
  it("doesn't require menu_id", () => {
    const result = navItemUpdateSchema.safeParse({
      label: "Products",
      href: "/products",
      is_external: false,
      parent_id: null,
    });
    expect(result.success).toBe(true);
  });
});
