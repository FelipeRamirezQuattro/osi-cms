import { describe, expect, it } from "vitest";
import {
  FORGE_MOTION,
  forgeHeroContentVariants,
  forgeHeroContentVariantsReduced,
  forgeHeroMediaVariants,
  forgeHeroMediaVariantsReduced,
  forgeRevealVariants,
  forgeRevealVariantsReduced,
} from "@/lib/motion/forge-motion";

describe("Forge motion recipe", () => {
  it("matches the approved prototype profile", () => {
    expect(FORGE_MOTION.reveal).toEqual({ y: 24, scale: 0.992, response: 0.48 });
    expect(FORGE_MOTION.hero.y).toBe(24);
    expect(FORGE_MOTION.mediaScale).toBe(1.035);
    expect(forgeRevealVariants.hidden).toMatchObject({ opacity: 0, y: 24, scale: 0.992 });
  });

  it("reduced variants never move, scale or spring", () => {
    expect(forgeRevealVariantsReduced.hidden).toMatchObject({ y: 0, scale: 1 });
    expect(forgeRevealVariantsReduced.visible).toMatchObject({ y: 0, scale: 1, transition: { duration: 0 } });
    expect(forgeHeroContentVariantsReduced.hidden).toEqual({ y: 0 });
    expect(forgeHeroMediaVariantsReduced.hidden).toEqual({ scale: 1 });
  });

  it("hero variants never animate opacity (the hero is the LCP element)", () => {
    for (const variants of [forgeHeroContentVariants, forgeHeroMediaVariants]) {
      expect(JSON.stringify(variants)).not.toContain("opacity");
    }
  });
});
