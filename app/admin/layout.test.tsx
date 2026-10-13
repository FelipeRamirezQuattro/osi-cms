import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./admin.css", () => ({}));

import AdminLayout, { metadata } from "./layout";

describe("AdminLayout", () => {
  it("opts the admin out of browser auto-translation", () => {
    const props = { children: <p>child</p> } as unknown as Parameters<typeof AdminLayout>[0];
    const { container } = render(<AdminLayout {...props} />);
    expect(container.querySelector(".admin-root")?.getAttribute("translate")).toBe("no");
    expect(metadata.other).toMatchObject({ google: "notranslate" });
  });
});
