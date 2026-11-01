// @vitest-environment node
import { describe, expect, it } from "vitest";
import { planAll, textCoverage } from "./plan-wix-pages";

describe("page re-import plan", () => {
  const plans = planAll();

  it("carries every visible Wix text run into the blocks, or lists why not", () => {
    for (const { spec, mapped } of plans) {
      const cov = textCoverage(spec, mapped);
      expect({ page: spec.slug, failing: cov.failing }).toEqual({ page: spec.slug, failing: [] });
    }
  });

  it("every block passes the registry schemas the admin save uses", () => {
    for (const { spec, problem } of plans) expect({ page: spec.slug, problem }).toEqual({ page: spec.slug, problem: null });
  });

  it("notices when a block's text is dropped (Machine Shop's Services list)", () => {
    const { spec, mapped } = plans.find((p) => p.spec.slug === "services/machine-shop")!;
    const without = { ...mapped, blocks: mapped.blocks.filter((b) => !JSON.stringify(b).includes("Staff Engineers")) };
    expect(textCoverage(spec, without).failing.some((t) => t.includes("Staff Engineers"))).toBe(true);
  });
});
