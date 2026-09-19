import { describe, expect, it } from "vitest";
import { countByKey, isBlogPath, seriesByDate, seriesByHour, trafficSourceLabel } from "@/lib/analytics/report-aggregation";

describe("countByKey", () => {
  it("counts occurrences per key and sorts descending by count", () => {
    const rows = [{ k: "a" }, { k: "b" }, { k: "a" }, { k: "a" }, { k: "b" }];
    expect(countByKey(rows, (r) => r.k)).toEqual([
      { key: "a", count: 3 },
      { key: "b", count: 2 },
    ]);
  });

  it("skips rows whose key function returns null", () => {
    const rows = [{ k: "a" }, { k: null }, { k: "a" }];
    expect(countByKey(rows, (r) => r.k)).toEqual([{ key: "a", count: 2 }]);
  });
});

describe("seriesByDate", () => {
  it("buckets rows by UTC date and sorts ascending", () => {
    const rows = [
      { created_at: "2026-01-02T10:00:00.000Z" },
      { created_at: "2026-01-01T05:00:00.000Z" },
      { created_at: "2026-01-01T20:00:00.000Z" },
    ];
    expect(seriesByDate(rows, (r) => r.created_at)).toEqual([
      { date: "2026-01-01", count: 2 },
      { date: "2026-01-02", count: 1 },
    ]);
  });
});

describe("seriesByHour", () => {
  it("returns all 24 hours, zero-filled, counted by UTC hour", () => {
    const rows = [{ created_at: "2026-01-01T00:00:00.000Z" }, { created_at: "2026-01-01T00:30:00.000Z" }, { created_at: "2026-01-01T23:00:00.000Z" }];
    const result = seriesByHour(rows);
    expect(result).toHaveLength(24);
    expect(result[0]).toEqual({ hour: 0, count: 2 });
    expect(result[23]).toEqual({ hour: 23, count: 1 });
    expect(result[12]).toEqual({ hour: 12, count: 0 });
  });
});

describe("trafficSourceLabel", () => {
  it("labels a null referrer as Direct", () => {
    expect(trafficSourceLabel({ referrer_host: null, traffic_category: "direct" })).toBe("Direct");
  });

  it("labels an organic referrer with (Organic), stripping www and capitalizing", () => {
    expect(trafficSourceLabel({ referrer_host: "www.google.com", traffic_category: "organic" })).toBe("Google.com (Organic)");
  });

  it("labels a social referrer with (Social)", () => {
    expect(trafficSourceLabel({ referrer_host: "linkedin.com", traffic_category: "social" })).toBe("Linkedin.com (Social)");
  });

  it("labels a paid referrer with (Paid)", () => {
    expect(trafficSourceLabel({ referrer_host: "google.com", traffic_category: "paid" })).toBe("Google.com (Paid)");
  });

  it("labels a plain referral with just the host", () => {
    expect(trafficSourceLabel({ referrer_host: "oilfieldjournal.com", traffic_category: "referral" })).toBe("oilfieldjournal.com");
  });
});

describe("isBlogPath", () => {
  it("matches the blog listing and post detail paths", () => {
    expect(isBlogPath("/news")).toBe(true);
    expect(isBlogPath("/news/some-post")).toBe(true);
    expect(isBlogPath("/blog")).toBe(true);
    expect(isBlogPath("/blog/some-post")).toBe(true);
  });

  it("does not match unrelated paths", () => {
    expect(isBlogPath("/products")).toBe(false);
    expect(isBlogPath("/newsletter")).toBe(false);
    expect(isBlogPath("/blogger")).toBe(false);
  });
});
