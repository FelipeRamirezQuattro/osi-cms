import { describe, expect, it } from "vitest";
import { getTextInputAttrs } from "@/lib/admin/field-input-attrs";

describe("getTextInputAttrs", () => {
  it("treats any key containing 'email' as an email field", () => {
    expect(getTextInputAttrs("email")).toEqual({
      type: "email",
      inputMode: "email",
      autoComplete: "off",
      spellCheck: false,
    });
    expect(getTextInputAttrs("notification_email")).toMatchObject({ type: "email" });
  });

  it("treats any key containing 'phone' as a tel field", () => {
    expect(getTextInputAttrs("phone")).toEqual({
      type: "tel",
      inputMode: "tel",
      autoComplete: "off",
      spellCheck: false,
    });
    expect(getTextInputAttrs("phone_cell")).toMatchObject({ type: "tel" });
    expect(getTextInputAttrs("phone_office")).toMatchObject({ type: "tel" });
  });

  it("gives url/href-shaped keys a url inputMode without a url input type (relative paths must still submit)", () => {
    for (const key of ["href", "ctaHref", "imageHref", "sourceHref", "imageUrl", "pdfUrl", "cover_image_url"]) {
      expect(getTextInputAttrs(key)).toEqual({
        type: "text",
        inputMode: "url",
        autoComplete: "off",
        spellCheck: false,
      });
    }
  });

  it("turns off spellcheck for identifier-shaped fields", () => {
    for (const key of ["slug", "anchorId", "formKey", "form_key", "icon_key", "status_code", "category_id"]) {
      expect(getTextInputAttrs(key)).toEqual({ type: "text", autoComplete: "off", spellCheck: false });
    }
  });

  it("defaults to a plain spell-checked text field for free-text content keys", () => {
    for (const key of ["title", "label", "headline", "description", "quote", "tagline"]) {
      expect(getTextInputAttrs(key)).toEqual({ type: "text", autoComplete: "off", spellCheck: true });
    }
  });
});
