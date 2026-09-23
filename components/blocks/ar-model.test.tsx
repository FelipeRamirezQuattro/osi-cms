import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { arModelBlock, type ArModelData } from "@/components/blocks/ar-model";
import { ArModelRender } from "@/components/blocks/ar-model-client";

afterEach(cleanup);

const base: ArModelData = {
  background: "cream",
  spacingTop: "md",
  spacingBottom: "md",
  title: undefined,
  glbUrl: "https://example.test/media/model.glb",
  usdzUrl: "https://example.test/media/model.usdz",
  posterUrl: undefined,
  alt: "Gas Release System 3D model",
  caption: undefined,
};

describe("arModelBlock schema", () => {
  it("accepts a fully specified block", () => {
    expect(arModelBlock.schema.safeParse(base).success).toBe(true);
  });

  it("rejects a block missing the .glb URL", () => {
    const result = arModelBlock.schema.safeParse({ ...base, glbUrl: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a block missing the .usdz URL", () => {
    const result = arModelBlock.schema.safeParse({ ...base, usdzUrl: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a block missing alt text", () => {
    const result = arModelBlock.schema.safeParse({ ...base, alt: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a .usdz file in the glbUrl field (swapped extensions)", () => {
    const result = arModelBlock.schema.safeParse({ ...base, glbUrl: "https://example.test/media/model.usdz" });
    expect(result.success).toBe(false);
  });

  it("rejects a .glb file in the usdzUrl field (swapped extensions)", () => {
    const result = arModelBlock.schema.safeParse({ ...base, usdzUrl: "https://example.test/media/model.glb" });
    expect(result.success).toBe(false);
  });
});

describe("ArModelRender", () => {
  it("renders a model-viewer element with the resolved src/ios-src/alt", () => {
    render(<ArModelRender data={base} />);
    const el = document.querySelector("model-viewer");
    expect(el).not.toBeNull();
    expect(el?.getAttribute("src")).toBe(base.glbUrl);
    expect(el?.getAttribute("ios-src")).toBe(base.usdzUrl);
    expect(el?.getAttribute("alt")).toBe(base.alt);
    // auto-rotate must never be set (no continuously-looping motion).
    expect(el?.hasAttribute("auto-rotate")).toBe(false);
  });

  it("renders the optional title as a heading when set", () => {
    render(<ArModelRender data={{ ...base, title: "Gas Release System" }} />);
    expect(screen.getByRole("heading", { name: "Gas Release System" })).toBeInTheDocument();
  });

  it("renders nothing when the required URLs are unset (defensive — schema already requires them before save)", () => {
    const { container } = render(<ArModelRender data={{ ...base, glbUrl: "" }} />);
    expect(container.innerHTML).toBe("");
  });
});
