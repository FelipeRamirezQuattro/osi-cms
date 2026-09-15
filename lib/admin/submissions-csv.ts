import type { Tables } from "@/lib/db/database.types";

/**
 * Task 15's submissions CSV export — pure formatting logic (no DB, no
 * "use server"), so it's directly unit-testable and reusable from both
 * the Server Action (lib/actions/submissions.ts) and a test file without
 * mocking Supabase.
 *
 * `payload` is an arbitrary per-form-key jsonb blob (see
 * lib/data/forms.ts) — rather than trying to flatten every possible
 * form's fields into their own CSV columns (which would produce a
 * different column set per form_key and a ragged CSV), it's serialized
 * as one JSON-string column alongside the fixed, always-present columns.
 */
const COLUMNS = ["id", "form_key", "status", "page_slug", "created_at", "payload"] as const;

/**
 * CSV/formula-injection guard: a cell opened by Excel/Sheets whose first
 * character is one of these triggers formula evaluation (e.g.
 * `=HYPERLINK(...)`) regardless of RFC 4180 quoting — quoting only
 * protects against the delimiter/newline, not against the spreadsheet
 * app's own formula parser. `page_slug` is attacker-controlled (it comes
 * straight from a public form's hidden-page-context field, only
 * trimmed/leading-slash-stripped — see lib/actions/submit-form.ts), so
 * this isn't hypothetical. Prefixing with a single quote is the standard
 * mitigation: Excel/Sheets both render it as literal text, not part of
 * the value.
 */
const FORMULA_INJECTION_PREFIX = /^[=+\-@\t\r]/;

/** RFC 4180 field escaping: wrap in quotes and double any embedded quote whenever the value contains a comma, quote, or newline. */
function csvField(value: string): string {
  const safeValue = FORMULA_INJECTION_PREFIX.test(value) ? `'${value}` : value;
  if (/[",\n\r]/.test(safeValue)) {
    return `"${safeValue.replace(/"/g, '""')}"`;
  }
  return safeValue;
}

export function buildSubmissionsCsv(rows: Tables<"form_submissions">[]): string {
  const lines = [COLUMNS.join(",")];
  for (const row of rows) {
    const values = [
      row.id,
      row.form_key,
      row.status,
      row.page_slug ?? "",
      row.created_at,
      JSON.stringify(row.payload ?? {}),
    ];
    lines.push(values.map((v) => csvField(String(v))).join(","));
  }
  // Trailing newline — conventional for CSV, and avoids a missing-final-
  // newline warning some spreadsheet tools show on import.
  return lines.join("\r\n") + "\r\n";
}
