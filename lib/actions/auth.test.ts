import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockVerifyEmailToken } = vi.hoisted(() => ({ mockVerifyEmailToken: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  verifyEmailToken: mockVerifyEmailToken,
  signInWithPassword: vi.fn(),
  signOutCurrentUser: vi.fn(),
  requestPasswordReset: vi.fn(),
}));
vi.mock("@/lib/seo", () => ({ siteUrl: () => "https://example.test" }));
// next/navigation's redirect throws to unwind — mirror that so code after it can't run.
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));

import { confirmEmailTokenAction } from "@/lib/actions/auth";

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("confirmEmailTokenAction", () => {
  it("verifies the token and continues to reset-password on success", async () => {
    mockVerifyEmailToken.mockResolvedValue({ error: null });
    await expect(confirmEmailTokenAction(form({ token_hash: "abc", type: "invite" }))).rejects.toThrow(
      "REDIRECT:/admin/reset-password",
    );
    expect(mockVerifyEmailToken).toHaveBeenCalledWith("abc", "invite");
  });

  it("sends an expired/used token to the request-a-new-link page", async () => {
    mockVerifyEmailToken.mockResolvedValue({ error: { message: "Token has expired or is invalid" } });
    await expect(confirmEmailTokenAction(form({ token_hash: "abc", type: "recovery" }))).rejects.toThrow(
      "REDIRECT:/admin/forgot-password?expired=1",
    );
  });

  it("rejects a missing token or an unsupported type without calling Supabase", async () => {
    await expect(confirmEmailTokenAction(form({ type: "recovery" }))).rejects.toThrow("expired=1");
    await expect(confirmEmailTokenAction(form({ token_hash: "abc", type: "magiclink" }))).rejects.toThrow("expired=1");
    expect(mockVerifyEmailToken).not.toHaveBeenCalled();
  });
});
