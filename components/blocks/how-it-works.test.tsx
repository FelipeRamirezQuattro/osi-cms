import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HowItWorksRender, howItWorksBlock, type HowItWorksData } from "@/components/blocks/how-it-works";

/**
 * Task 7 item #4: the product detail page used to hardcode `show3d: true`
 * regardless of whether products.model_3d_url was actually set, rendering
 * a dead `href="#"` link on every product. model3dUrl now controls the
 * CTA directly, mirroring the already-correct pdfUrl pattern in this same
 * file: a real link when set, a disabled placeholder when not.
 */

function render(data: Partial<HowItWorksData> = {}) {
  const defaults = howItWorksBlock.defaults as HowItWorksData;
  return renderToStaticMarkup(<HowItWorksRender data={{ ...defaults, ...data }} />);
}

describe("HowItWorksRender's 3D CTA", () => {
  it("renders a real link to model3dUrl when set", () => {
    const html = render({ model3dUrl: "https://cdn.example.com/model.glb" });
    const container = document.createElement("div");
    container.innerHTML = html;
    const link = [...container.querySelectorAll("a")].find((a) => a.textContent === "See this tool in 3D");
    expect(link?.getAttribute("href")).toBe("https://cdn.example.com/model.glb");
  });

  it("renders a disabled placeholder (no href, no dead link) when model3dUrl is absent", () => {
    const html = render({ model3dUrl: null });
    const container = document.createElement("div");
    container.innerHTML = html;
    const links = [...container.querySelectorAll("a")].filter((a) => a.textContent?.includes("3D"));
    expect(links).toHaveLength(0);
    expect(container.textContent).toContain("See this tool in 3D — pending client file");
  });
});

describe("HowItWorksRender's PDF CTA (unchanged reference behavior)", () => {
  it("still renders a real link when pdfUrl is set", () => {
    const html = render({ pdfUrl: "https://cdn.example.com/brochure.pdf" });
    const container = document.createElement("div");
    container.innerHTML = html;
    const link = [...container.querySelectorAll("a")].find((a) => a.textContent === "Download PDF");
    expect(link?.getAttribute("href")).toBe("https://cdn.example.com/brochure.pdf");
  });
});
