import { describe, expect, it } from "vitest";
import { getNewsletterReadiness } from "@/lib/newsletter/readiness";

const full = {
  RESEND_API_KEY: "k",
  RESEND_FROM_EMAIL: "News <news@example.com>",
  NEWSLETTER_TOKEN_SECRET: "s",
  NEWSLETTER_MAILING_ADDRESS: "1 Main St",
};

describe("getNewsletterReadiness", () => {
  it("is ready when everything is set", () => {
    expect(getNewsletterReadiness(full)).toEqual({ canSendTest: true, canSendCampaign: true, missing: [] });
  });

  it("allows a test send but not a campaign without the secret or mailing address", () => {
    const result = getNewsletterReadiness({ ...full, NEWSLETTER_MAILING_ADDRESS: undefined });
    expect(result).toEqual({ canSendTest: true, canSendCampaign: false, missing: ["NEWSLETTER_MAILING_ADDRESS"] });
    expect(getNewsletterReadiness({ ...full, NEWSLETTER_TOKEN_SECRET: "" }).canSendCampaign).toBe(false);
  });

  it("blocks both without a sender, listing what is missing", () => {
    const result = getNewsletterReadiness({});
    expect(result.canSendTest).toBe(false);
    expect(result.canSendCampaign).toBe(false);
    expect(result.missing).toEqual(["RESEND_API_KEY", "RESEND_FROM_EMAIL", "NEWSLETTER_TOKEN_SECRET", "NEWSLETTER_MAILING_ADDRESS"]);
  });
});
