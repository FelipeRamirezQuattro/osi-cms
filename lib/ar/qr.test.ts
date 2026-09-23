import { describe, expect, it } from "vitest";
import { generateQrCodeSvg } from "@/lib/ar/qr";

describe("generateQrCodeSvg", () => {
  it("returns SVG markup encoding the given URL", async () => {
    const svg = await generateQrCodeSvg("https://example.com/products/gas-release-system");
    expect(svg.trim().startsWith("<svg")).toBe(true);
    expect(svg).toContain("</svg>");
  });

  it("produces different markup for different input", async () => {
    const a = await generateQrCodeSvg("https://example.com/a");
    const b = await generateQrCodeSvg("https://example.com/b");
    expect(a).not.toBe(b);
  });
});
