import { beforeEach, describe, expect, it, vi } from "vitest";
import { OSI_SEED_BRANDING_CONFIG } from "@/lib/branding/seed";

vi.mock("server-only", () => ({}));

const { mockGetPublishedBranding } = vi.hoisted(() => ({ mockGetPublishedBranding: vi.fn() }));
vi.mock("@/lib/data/branding", () => ({ getPublishedBranding: mockGetPublishedBranding }));

import { applyLayoutOverride, resolvePublishedBranding } from "@/lib/branding/resolve";

describe("resolvePublishedBranding", () => {
  beforeEach(() => {
    mockGetPublishedBranding.mockReset();
  });

  it("returns the validated public publication", async () => {
    mockGetPublishedBranding.mockResolvedValue({
      config: OSI_SEED_BRANDING_CONFIG,
      published_version: 7,
    });

    await expect(resolvePublishedBranding()).resolves.toEqual({
      config: OSI_SEED_BRANDING_CONFIG,
      source: "published",
      publishedVersion: 7,
    });
  });

  it("uses the OSI fallback when no publication exists", async () => {
    mockGetPublishedBranding.mockResolvedValue(null);

    await expect(resolvePublishedBranding()).resolves.toEqual({
      config: OSI_SEED_BRANDING_CONFIG,
      source: "fallback",
      publishedVersion: null,
    });
  });

  it("uses the OSI fallback when the publication read or validation fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetPublishedBranding.mockRejectedValue(new Error("malformed publication"));

    const resolved = await resolvePublishedBranding();
    expect(resolved.source).toBe("fallback");
    expect(resolved.config).toEqual(OSI_SEED_BRANDING_CONFIG);
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });
});

describe("applyLayoutOverride", () => {
  const env = (vars: Record<string, string>) => vars as unknown as NodeJS.ProcessEnv;

  it("forces a valid layout outside Vercel production", () => {
    expect(applyLayoutOverride(OSI_SEED_BRANDING_CONFIG, env({ OSI_LAYOUT_OVERRIDE: "forge" })).layout).toBe("forge");
    expect(applyLayoutOverride(OSI_SEED_BRANDING_CONFIG, env({ OSI_LAYOUT_OVERRIDE: "classic" })).layout).toBe("classic");
  });

  it("does nothing when unset or invalid, and never on Vercel production", () => {
    expect(applyLayoutOverride(OSI_SEED_BRANDING_CONFIG, env({}))).toBe(OSI_SEED_BRANDING_CONFIG);
    expect(applyLayoutOverride(OSI_SEED_BRANDING_CONFIG, env({ OSI_LAYOUT_OVERRIDE: "vector" }))).toBe(OSI_SEED_BRANDING_CONFIG);
    expect(
      applyLayoutOverride(OSI_SEED_BRANDING_CONFIG, env({ OSI_LAYOUT_OVERRIDE: "forge", VERCEL_ENV: "production" })),
    ).toBe(OSI_SEED_BRANDING_CONFIG);
  });
});
