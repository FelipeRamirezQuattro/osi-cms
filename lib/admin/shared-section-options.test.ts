import { describe, expect, it } from "vitest";
import { sharedSectionOptions } from "@/lib/admin/shared-section-options";

describe("sharedSectionOptions", () => {
  const sections = [
    { key: "footer-cta", title: "Footer CTA", status: "published" },
    { key: "promo", title: "Promo", status: "draft" },
  ];

  it("stores the key and shows the title, flagging unpublished sections", () => {
    expect(sharedSectionOptions(sections)).toEqual([
      { value: "footer-cta", label: "Footer CTA" },
      { value: "promo", label: "Promo (draft — hidden until published)" },
    ]);
  });

  it("can exclude the section being edited so it can't reference itself", () => {
    expect(sharedSectionOptions(sections, "promo").map((o) => o.value)).toEqual(["footer-cta"]);
  });
});
