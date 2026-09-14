import { describe, expect, it } from "vitest";
import { siteSettingsSchema } from "@/lib/validation/settings";

describe("siteSettingsSchema", () => {
  it("accepts a mostly-empty settings payload (every column is nullable)", () => {
    const result = siteSettingsSchema.safeParse({ phone: "555-1234", address_lines: [] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBeNull();
      expect(result.data.map_embed_url).toBeNull();
    }
  });

  it("rejects a malformed email", () => {
    expect(siteSettingsSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
  });

  it("accepts a valid email and normalizes a blank one to null", () => {
    expect(siteSettingsSchema.safeParse({ email: "hello@osi.example" }).success).toBe(true);
    const blank = siteSettingsSchema.safeParse({ email: "" });
    expect(blank.success && blank.data.email).toBeNull();
  });

  it("rejects an unsafe social/map URL and accepts a real one", () => {
    expect(siteSettingsSchema.safeParse({ social_facebook: "javascript:alert(1)" }).success).toBe(false);
    expect(siteSettingsSchema.safeParse({ map_embed_url: "https://maps.google.com/embed" }).success).toBe(true);
  });
});
