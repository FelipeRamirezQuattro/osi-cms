import { describe, expect, it } from "vitest";
import { classifyTraffic } from "@/lib/analytics/classify-traffic";

describe("classifyTraffic", () => {
  it("classifies as paid when utm_medium indicates a paid channel", () => {
    expect(classifyTraffic({ referrerHost: "google.com", utmMedium: "cpc" })).toBe("paid");
  });

  it("classifies as direct when there is no referrer and no utm params", () => {
    expect(classifyTraffic({ referrerHost: null, utmMedium: null })).toBe("direct");
  });

  it("classifies as organic when the referrer is a known search engine", () => {
    expect(classifyTraffic({ referrerHost: "www.google.com", utmMedium: null })).toBe("organic");
  });

  it("classifies as organic for bing", () => {
    expect(classifyTraffic({ referrerHost: "www.bing.com", utmMedium: null })).toBe("organic");
  });

  it("classifies as social when the referrer is a known social network", () => {
    expect(classifyTraffic({ referrerHost: "www.linkedin.com", utmMedium: null })).toBe("social");
  });

  it("classifies as referral for any other known host", () => {
    expect(classifyTraffic({ referrerHost: "oilfieldjournal.com", utmMedium: null })).toBe("referral");
  });

  it("paid takes priority over an organic-looking referrer", () => {
    expect(classifyTraffic({ referrerHost: "www.google.com", utmMedium: "cpc" })).toBe("paid");
  });
});
