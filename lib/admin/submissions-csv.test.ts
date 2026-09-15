import { describe, expect, it } from "vitest";
import { buildSubmissionsCsv } from "@/lib/admin/submissions-csv";
import type { Tables } from "@/lib/db/database.types";

function submission(overrides: Partial<Tables<"form_submissions">> = {}): Tables<"form_submissions"> {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    form_key: "contact",
    payload: { name: "Jane Doe", email: "jane@example.com" },
    page_slug: "contact",
    ip_hash: "hash",
    user_agent: "test-agent",
    status: "new",
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildSubmissionsCsv", () => {
  it("emits a header row and one row per submission", () => {
    const csv = buildSubmissionsCsv([submission()]);
    const lines = csv.trim().split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe("id,form_key,status,page_slug,created_at,payload");
  });

  it("serializes the payload as a JSON string", () => {
    const csv = buildSubmissionsCsv([submission()]);
    expect(csv).toContain('"{""name"":""Jane Doe"",""email"":""jane@example.com""}"');
  });

  it("escapes a field containing a comma", () => {
    const csv = buildSubmissionsCsv([submission({ page_slug: "products, list" })]);
    expect(csv).toContain('"products, list"');
  });

  it("escapes an embedded quote (from JSON-stringifying the payload) by doubling every quote character", () => {
    const csv = buildSubmissionsCsv([submission({ payload: { note: 'Say "hi"' } })]);
    // JSON.stringify({ note: 'Say "hi"' }) is `{"note":"Say \"hi\""}` — every
    // literal `"` in that string (both the JSON structure's own quotes and
    // the backslash-escaped ones around "hi") gets doubled by RFC 4180
    // escaping, and the backslashes themselves pass through unchanged.
    const rawJson = JSON.stringify({ note: 'Say "hi"' });
    const expectedEscaped = rawJson.replace(/"/g, '""');
    expect(csv).toContain(expectedEscaped);
  });

  it("renders a null page_slug as an empty field", () => {
    const csv = buildSubmissionsCsv([submission({ page_slug: null })]);
    const [, dataLine] = csv.trim().split("\r\n");
    expect(dataLine.split(",")).toContain("");
  });

  it("returns just the header for an empty list", () => {
    const csv = buildSubmissionsCsv([]);
    expect(csv.trim()).toBe("id,form_key,status,page_slug,created_at,payload");
  });
});
