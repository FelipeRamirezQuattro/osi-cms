import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compositeOverBackground, contrastRatio } from "@/lib/branding/schema";
import { OSI_SEED_BRANDING_CONFIG } from "@/lib/branding/seed";

/**
 * Forge puts white text straight over photography, so the hero shade has to
 * carry contrast for ANY photo. This reads the real stops out of app/forge.css
 * and checks the worst case — a pure-white photo pixel, dimmed by the image's
 * own brightness filter — at the horizontal position where each text element
 * ends. If someone lightens the shade, this fails.
 */
const css = readFileSync("app/forge.css", "utf8");
const navy = OSI_SEED_BRANDING_CONFIG.swatches.find((s) => s.id === "osi-navy-900")!.hex;

function heroScrimStops(): Array<{ at: number; alpha: number }> {
  const rule = /\[data-hero-scrim\]\s*\{[^}]*?linear-gradient\(90deg,([\s\S]*?)\),\s*linear-gradient\(0deg/.exec(css);
  expect(rule, "desktop hero scrim gradient").not.toBeNull();
  return [...rule![1].matchAll(/dark-surface\)\s*(\d+)%,\s*transparent\)\s*(\d+)%/g)].map((m) => ({
    alpha: Number(m[1]) / 100,
    at: Number(m[2]) / 100,
  }));
}

function alphaAt(stops: Array<{ at: number; alpha: number }>, x: number): number {
  for (let i = 1; i < stops.length; i++) {
    if (x <= stops[i].at) {
      const [a, b] = [stops[i - 1], stops[i]];
      return a.alpha + ((b.alpha - a.alpha) * (x - a.at)) / (b.at - a.at);
    }
  }
  return stops.at(-1)!.alpha;
}

const brightness = Number(/data-duotone-image\]\s*\{[^}]*brightness\(([\d.]+)\)/.exec(css)?.[1] ?? 1);
const worstPhoto = `#${[255, 255, 255].map((c) => Math.round(c * brightness).toString(16).padStart(2, "0")).join("").toUpperCase()}`;

describe("Forge hero shade guarantees contrast over a white photograph", () => {
  const stops = heroScrimStops();

  it("parses the stops", () => {
    expect(stops.length).toBeGreaterThanOrEqual(3);
    expect(brightness).toBeLessThan(1);
  });

  it("white body copy (ends by ~46% of the width) clears 4.5:1", () => {
    const bg = compositeOverBackground(navy, alphaAt(stops, 0.46), worstPhoto);
    expect(contrastRatio("#FFFFFF", bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("white display title (ends by ~64% of the width, large text) clears 3:1", () => {
    const bg = compositeOverBackground(navy, alphaAt(stops, 0.64), worstPhoto);
    expect(contrastRatio("#FFFFFF", bg)).toBeGreaterThanOrEqual(3);
  });
});
