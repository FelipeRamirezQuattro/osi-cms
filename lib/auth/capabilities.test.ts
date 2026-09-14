import { describe, expect, it } from "vitest";
import { hasCapability } from "@/lib/auth/capabilities";

describe("admin capabilities", () => {
  it("lets editors work on drafts but not publish or delete", () => {
    expect(hasCapability("editor", "edit_drafts")).toBe(true);
    expect(hasCapability("editor", "view_submissions")).toBe(true);
    expect(hasCapability("editor", "publish")).toBe(false);
    expect(hasCapability("editor", "delete_content")).toBe(false);
    expect(hasCapability("editor", "manage_users")).toBe(false);
  });

  it("grants administrators every named capability", () => {
    expect(hasCapability("admin", "publish")).toBe(true);
    expect(hasCapability("admin", "manage_settings")).toBe(true);
    expect(hasCapability("admin", "view_audit")).toBe(true);
  });
});
