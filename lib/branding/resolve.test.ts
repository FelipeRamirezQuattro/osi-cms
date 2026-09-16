import { beforeEach, describe, expect, it, vi } from "vitest";
import { OSI_SEED_BRANDING_CONFIG } from "@/lib/branding/seed";

vi.mock("server-only", () => ({}));

const { mockGetPublishedBranding } = vi.hoisted(() => ({ mockGetPublishedBranding: vi.fn() }));
vi.mock("@/lib/data/branding", () => ({ getPublishedBranding: mockGetPublishedBranding }));

import { resolvePublishedBranding } from "@/lib/branding/resolve";

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
