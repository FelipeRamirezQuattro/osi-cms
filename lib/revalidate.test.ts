import { describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath }));

describe("revalidatePublicSite", () => {
  it("revalidates the whole public site from the root layout", async () => {
    const { revalidatePublicSite } = await import("./revalidate");
    revalidatePublicSite();
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});
