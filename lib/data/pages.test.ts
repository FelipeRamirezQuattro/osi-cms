import { describe, expect, it } from "vitest";
import { isVersionConflictError } from "@/lib/data/pages";

describe("isVersionConflictError", () => {
  it("recognizes a Postgres 40001 (serialization failure) error object", () => {
    expect(isVersionConflictError({ code: "40001", message: "stale" })).toBe(true);
  });

  it("rejects other Postgres error codes", () => {
    expect(isVersionConflictError({ code: "23505", message: "duplicate slug" })).toBe(false);
    expect(isVersionConflictError({ code: "42501", message: "not authorized" })).toBe(false);
  });

  it("rejects non-error-shaped values without throwing", () => {
    expect(isVersionConflictError(null)).toBe(false);
    expect(isVersionConflictError(undefined)).toBe(false);
    expect(isVersionConflictError("plain string error")).toBe(false);
    expect(isVersionConflictError(new Error("generic failure"))).toBe(false);
    expect(isVersionConflictError({})).toBe(false);
  });
});
