import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const unsubscribeSubscriber = vi.hoisted(() => vi.fn());
vi.mock("@/lib/data/newsletter-subscribers", () => ({ unsubscribeSubscriber }));

import { GET, POST } from "@/app/api/newsletter/unsubscribe/route";
import { createSubscriberToken } from "@/lib/newsletter/tokens";

const ID = "3f1c2b4a-5d6e-4f70-8a91-b2c3d4e5f607";
const request = (token: string | null, method = "POST") =>
  new NextRequest(`http://localhost:3000/api/newsletter/unsubscribe${token === null ? "" : `?token=${encodeURIComponent(token)}`}`, { method });

describe("one-click unsubscribe route", () => {
  const original = process.env.NEWSLETTER_TOKEN_SECRET;
  beforeEach(() => {
    process.env.NEWSLETTER_TOKEN_SECRET = "s";
    unsubscribeSubscriber.mockReset().mockResolvedValue(true);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    if (original === undefined) delete process.env.NEWSLETTER_TOKEN_SECRET;
    else process.env.NEWSLETTER_TOKEN_SECRET = original;
  });

  it("unsubscribes immediately on a POST with a valid token", async () => {
    const response = await POST(request(createSubscriberToken("unsubscribe", ID)));
    expect(response.status).toBe(200);
    expect(unsubscribeSubscriber).toHaveBeenCalledWith(ID);
  });

  it("rejects a missing, forged, or wrong-purpose token without changing anything", async () => {
    for (const token of [null, `${ID}.forged`, createSubscriberToken("confirm", ID)]) {
      expect((await POST(request(token))).status).toBe(400);
    }
    expect(unsubscribeSubscriber).not.toHaveBeenCalled();
  });

  it("never changes state on a GET — it redirects to the confirmation page", async () => {
    const response = await GET(request(createSubscriberToken("unsubscribe", ID), "GET"));
    expect(response.status).toBe(303);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/newsletter/unsubscribe");
    expect(unsubscribeSubscriber).not.toHaveBeenCalled();
  });

  it("returns 500 when the database fails", async () => {
    unsubscribeSubscriber.mockRejectedValue(new Error("db down"));
    expect((await POST(request(createSubscriberToken("unsubscribe", ID)))).status).toBe(500);
  });
});
