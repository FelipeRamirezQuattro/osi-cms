import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ requireCapability: vi.fn() }));
const d = vi.hoisted(() => ({ addOrResubscribeByStaff: vi.fn(), setSubscriberTags: vi.fn() }));

vi.mock("@/lib/auth", () => auth);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/data/newsletter-subscribers", () => d);

import { addSubscriberAction } from "@/lib/actions/newsletter-subscribers";

const SID = "3f1c2b4a-5d6e-4f70-8a91-b2c3d4e5f607";
const TAG = "00000000-0000-4000-8000-000000000001";

describe("addSubscriberAction", () => {
  beforeEach(() => {
    auth.requireCapability.mockReset().mockResolvedValue({ role: "editor" });
    d.addOrResubscribeByStaff.mockReset().mockResolvedValue({ subscriber: { id: SID, email: "a@example.com" }, previousStatus: null });
    d.setSubscriberTags.mockReset().mockResolvedValue(undefined);
  });

  it("requires manage_newsletter, the same gate as the rest of the page", async () => {
    await addSubscriberAction("a@example.com", []);
    expect(auth.requireCapability).toHaveBeenCalledWith("manage_newsletter");
  });

  it("normalizes and lowercases the email, and reports a fresh add", async () => {
    const result = await addSubscriberAction("  New@Example.COM ", []);
    expect(d.addOrResubscribeByStaff).toHaveBeenCalledWith("new@example.com");
    expect(result).toEqual({ status: "success", alreadySubscribed: false });
  });

  it("reports an already-subscribed address distinctly, without treating it as an error", async () => {
    d.addOrResubscribeByStaff.mockResolvedValue({ subscriber: { id: SID, email: "a@example.com" }, previousStatus: "subscribed" });
    expect(await addSubscriberAction("a@example.com", [])).toEqual({ status: "success", alreadySubscribed: true });
  });

  it("resubscribing a pending or unsubscribed address is not reported as already-subscribed", async () => {
    for (const previousStatus of ["pending", "unsubscribed"]) {
      d.addOrResubscribeByStaff.mockResolvedValue({ subscriber: { id: SID, email: "a@example.com" }, previousStatus });
      expect(await addSubscriberAction("a@example.com", [])).toEqual({ status: "success", alreadySubscribed: false });
    }
  });

  it("rejects an invalid email without writing anything", async () => {
    const result = await addSubscriberAction("not-an-email", [TAG]);
    expect(result.status).toBe("error");
    expect(d.addOrResubscribeByStaff).not.toHaveBeenCalled();
    expect(d.setSubscriberTags).not.toHaveBeenCalled();
  });

  it("sets tags on the resulting subscriber when tag ids are given, and skips the call when none are", async () => {
    await addSubscriberAction("a@example.com", [TAG]);
    expect(d.setSubscriberTags).toHaveBeenCalledWith(SID, [TAG]);

    d.setSubscriberTags.mockClear();
    await addSubscriberAction("a@example.com", []);
    expect(d.setSubscriberTags).not.toHaveBeenCalled();
  });
});
