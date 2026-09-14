import { describe, expect, it } from "vitest";
import { newPageSlugSchema, pageMetaSchema } from "@/lib/validation/pages";

describe("pageMetaSchema", () => {
  const base = {
    slug: "about-us",
    locale: "en",
    title: "About Us",
    template: "standard",
    seo_title: "",
    seo_description: undefined,
    og_image_url: null,
    noindex: false,
  };

  it("accepts a well-formed page and normalizes blank optional fields to null", () => {
    const result = pageMetaSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.seo_title).toBeNull();
      expect(result.data.seo_description).toBeNull();
    }
  });

  it("rejects a blank title", () => {
    const result = pageMetaSchema.safeParse({ ...base, title: "  " });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid template", () => {
    const result = pageMetaSchema.safeParse({ ...base, template: "not-a-template" });
    expect(result.success).toBe(false);
  });

  it("strips leading/trailing slashes from the slug", () => {
    const result = pageMetaSchema.safeParse({ ...base, slug: "/about-us/" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.slug).toBe("about-us");
  });

  it("rejects an uppercase or space-containing slug", () => {
    expect(pageMetaSchema.safeParse({ ...base, slug: "About Us" }).success).toBe(false);
  });
});

describe("newPageSlugSchema (duplicatePageAction)", () => {
  it("accepts a real slug and rejects a blank one", () => {
    expect(newPageSlugSchema.safeParse("about-us-copy").success).toBe(true);
    expect(newPageSlugSchema.safeParse("").success).toBe(false);
  });
});
