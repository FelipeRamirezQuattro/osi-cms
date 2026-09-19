import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ confirmSubscriber: vi.fn(), unsubscribeSubscriber: vi.fn() }));
vi.mock("@/lib/data/newsletter-subscribers", () => m);

import { confirmNewsletterSubscription, unsubscribeFromNewsletter } from "@/lib/actions/newsletter-subscription";
import { createSubscriberToken } from "@/lib/newsletter/tokens";

const ID = "3f1c2b4a-5d6e-4f70-8a91-b2c3d4e5f607";
const idle = { status: "idle" as const };
const form = (token: string | null) => {
  const data = new FormData();
  if (token !== null) data.set("token", token);
  return data;
};

describe("newsletter confirm / unsubscribe actions", () => {
  const originalSecret = process.env.NEWSLETTER_TOKEN_SECRET;
  beforeEach(() => {
    process.env.NEWSLETTER_TOKEN_SECRET = "test-secret";
    m.confirmSubscriber.mockReset().mockResolvedValue("confirmed");
    m.unsubscribeSubscriber.mockReset().mockResolvedValue(true);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    if (originalSecret === undefined) delete process.env.NEWSLETTER_TOKEN_SECRET;
    else process.env.NEWSLETTER_TOKEN_SECRET = originalSecret;
  });

  it("confirms with a valid confirm token", async () => {
    const result = await confirmNewsletterSubscription(idle, form(createSubscriberToken("confirm", ID)));
    expect(result.status).toBe("success");
    expect(m.confirmSubscriber).toHaveBeenCalledWith(ID);
  });

  it("refuses a forged, missing, or wrong-purpose token and changes nothing", async () => {
    for (const token of [`${ID}.forged`, null, createSubscriberToken("unsubscribe", ID)]) {
      const result = await confirmNewsletterSubscription(idle, form(token));
      expect(result.status).toBe("error");
    }
    expect(m.confirmSubscriber).not.toHaveBeenCalled();
  });

  it("reports that a no-longer-pending subscription can't be confirmed (never re-subscribes)", async () => {
    m.confirmSubscriber.mockResolvedValue("not_pending");
    const result = await confirmNewsletterSubscription(idle, form(createSubscriberToken("confirm", ID)));
    expect(result.status).toBe("error");
  });

  it("unsubscribes with a valid unsubscribe token, even if the row is already gone", async () => {
    m.unsubscribeSubscriber.mockResolvedValue(false);
    const result = await unsubscribeFromNewsletter(idle, form(createSubscriberToken("unsubscribe", ID)));
    expect(result.status).toBe("success");
    expect(m.unsubscribeSubscriber).toHaveBeenCalledWith(ID);
  });

  it("does not let a confirm token unsubscribe anyone", async () => {
    const result = await unsubscribeFromNewsletter(idle, form(createSubscriberToken("confirm", ID)));
    expect(result.status).toBe("error");
    expect(m.unsubscribeSubscriber).not.toHaveBeenCalled();
  });
});
