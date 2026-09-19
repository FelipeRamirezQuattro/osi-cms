import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSubscriberToken, isTokenSecretConfigured, verifySubscriberToken } from "@/lib/newsletter/tokens";

const ID = "3f1c2b4a-5d6e-4f70-8a91-b2c3d4e5f607";

describe("newsletter tokens", () => {
  const original = process.env.NEWSLETTER_TOKEN_SECRET;
  beforeEach(() => {
    process.env.NEWSLETTER_TOKEN_SECRET = "test-secret-value";
  });
  afterEach(() => {
    if (original === undefined) delete process.env.NEWSLETTER_TOKEN_SECRET;
    else process.env.NEWSLETTER_TOKEN_SECRET = original;
  });

  it("round-trips a token for the same purpose", () => {
    const token = createSubscriberToken("confirm", ID);
    expect(token).toMatch(new RegExp(`^${ID}\\.`));
    expect(verifySubscriberToken("confirm", token)).toBe(ID);
  });

  it("is deterministic, so an unsubscribe link can be re-derived for every send", () => {
    expect(createSubscriberToken("unsubscribe", ID)).toBe(createSubscriberToken("unsubscribe", ID));
  });

  it("does not let a token for one purpose act as the other", () => {
    expect(verifySubscriberToken("unsubscribe", createSubscriberToken("confirm", ID))).toBeNull();
    expect(verifySubscriberToken("confirm", createSubscriberToken("unsubscribe", ID))).toBeNull();
  });

  it("rejects tampered, truncated, foreign-id and malformed tokens", () => {
    const token = createSubscriberToken("confirm", ID)!;
    const otherId = "00000000-0000-4000-8000-000000000000";
    expect(verifySubscriberToken("confirm", `${otherId}.${token.split(".")[1]}`)).toBeNull();
    expect(verifySubscriberToken("confirm", `${token}x`)).toBeNull();
    expect(verifySubscriberToken("confirm", token.slice(0, -2))).toBeNull();
    expect(verifySubscriberToken("confirm", "not-a-token")).toBeNull();
    expect(verifySubscriberToken("confirm", `nope.${token.split(".")[1]}`)).toBeNull();
    expect(verifySubscriberToken("confirm", "")).toBeNull();
    expect(verifySubscriberToken("confirm", null)).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const token = createSubscriberToken("confirm", ID);
    process.env.NEWSLETTER_TOKEN_SECRET = "a-different-secret";
    expect(verifySubscriberToken("confirm", token)).toBeNull();
  });

  it("fails closed when the secret is not configured", () => {
    delete process.env.NEWSLETTER_TOKEN_SECRET;
    expect(isTokenSecretConfigured()).toBe(false);
    expect(createSubscriberToken("confirm", ID)).toBeNull();
    expect(verifySubscriberToken("confirm", `${ID}.abc`)).toBeNull();
  });
});
