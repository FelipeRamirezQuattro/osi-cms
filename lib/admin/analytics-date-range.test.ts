import { describe, expect, it, vi } from "vitest";
import { resolveDateRange } from "@/lib/admin/analytics-date-range";

describe("resolveDateRange", () => {
  it("defaults to the last 30 days (inclusive) ending today when no params are given", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-17T12:00:00.000Z"));
    expect(resolveDateRange({})).toEqual({ startDate: "2026-08-19", endDate: "2026-09-17" });
    vi.useRealTimers();
  });

  it("uses valid from/to query params verbatim", () => {
    expect(resolveDateRange({ from: "2026-01-01", to: "2026-01-31" })).toEqual({
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    });
  });

  it("falls back to the default for a malformed date param", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-17T12:00:00.000Z"));
    expect(resolveDateRange({ from: "not-a-date", to: "2026-01-31" })).toEqual({
      startDate: "2026-08-19",
      endDate: "2026-01-31",
    });
    vi.useRealTimers();
  });

  it("takes the first value when a param is an array", () => {
    expect(resolveDateRange({ from: ["2026-01-01", "2026-02-01"], to: "2026-01-31" })).toEqual({
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    });
  });
});
