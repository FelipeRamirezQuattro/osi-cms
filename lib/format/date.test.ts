import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatInteger } from "./date";

describe("admin formatters", () => {
  it("never emits a non-breaking space", () => {
    expect(formatDateTime("2026-10-19T20:02:03Z")).not.toMatch(/[\u202f\u00a0]/);
  });

  it("renders a fixed zone and locale regardless of the runtime's", () => {
    expect(formatDateTime("2026-10-19T20:02:03Z")).toBe("Oct 19, 2026, 3:02 PM CDT");
    expect(formatDateTime("2026-01-05T18:00:00Z")).toBe("Jan 5, 2026, 12:00 PM CST");
    expect(formatDate("2026-01-05T03:00:00Z")).toBe("Jan 4, 2026");
    expect(formatInteger(1234567)).toBe("1,234,567");
  });
});
