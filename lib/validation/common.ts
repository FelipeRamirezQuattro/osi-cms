import { z } from "zod";
import { isSafeHref } from "@/lib/routes";

/**
 * Shared primitives for every file under lib/validation/ — the
 * server-side Zod boundary for admin mutations (see CLAUDE.md's Phase 2
 * remediation notes). Each domain file (pages/products/entities/
 * navigation/settings/media/forms) composes these instead of hand-rolling
 * its own `nullif`/`|| null`/ad hoc regex per field.
 */

/**
 * Normalizes a blank (or whitespace-only) string to `null`; trims a
 * non-blank string; passes every other value (including `null`,
 * `undefined`, numbers, booleans) through untouched. This is the single
 * place "empty optional field" normalization happens — every optional
 * text field in lib/validation/* runs through this via
 * `optionalNullableString`/`optionalSafeHrefSchema` rather than a
 * scattered `value || null` at the call site.
 */
export function emptyStringToNull(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * A required, meaningfully non-empty (post-trim) string. Blank or
 * whitespace-only input fails with a friendly, field-named message —
 * this is what "Require meaningful non-empty names/titles/slugs/labels"
 * (Task 6) actually enforces; a bare `z.string()` accepts `""`.
 */
export function requiredString(label: string, max?: number) {
  let schema = z.string().trim().min(1, `${label} is required`);
  if (max) schema = schema.max(max, `${label} must be ${max} characters or fewer`);
  return schema;
}

/**
 * An optional, nullable text field — "" and undefined both normalize to
 * `null` (never left as undefined), so the parsed output is always safe
 * to hand straight to a Supabase `.insert()`/`.update()` call whose
 * generated Row/Update type is `string | null` with no `?`.
 */
export function optionalNullableString(max?: number) {
  const inner = max ? z.string().max(max, `Must be ${max} characters or fewer`) : z.string();
  return z.preprocess(emptyStringToNull, inner.nullable().default(null));
}

/**
 * An optional, nullable numeric field — "" and undefined both normalize
 * to `null` (matches lib/admin/entity-config.ts's coerceValues, which
 * already turns a blank number input into `null` before this runs; kept
 * here too so this schema is correct standalone, not just after that
 * specific caller).
 */
export function optionalNullableNumber(min?: number, max?: number) {
  let schema = z.number();
  if (min !== undefined) schema = schema.min(min, `Must be ${min} or greater`);
  if (max !== undefined) schema = schema.max(max, `Must be ${max} or less`);
  return z.preprocess((value) => (value === "" || value === undefined ? null : value), schema.nullable().default(null));
}

/** Optional, nullable email field — "" and undefined normalize to `null`; a set value must look like an email. */
export function optionalEmailSchema(label = "Email") {
  return z.preprocess(
    emptyStringToNull,
    z.string().trim().email(`${label} must be a valid email address`).nullable().default(null),
  );
}

/**
 * Slug format shared by pages/products/taxonomy entities: lowercase
 * letters, digits, and hyphens, optionally nested with a single `/`
 * (e.g. "services/machine-shop") — mirrors the `trim(both '/' from ...)`
 * convention the DB side already applies (save_page_draft_atomic,
 * duplicate_page_atomic in supabase/migrations/0017_publishing_permissions_atomic.sql).
 * Leading/trailing slashes are stripped before the format check so
 * "/contact/" and "contact" validate identically.
 */
const SLUG_PATTERN = /^[a-z0-9]+(?:[-/][a-z0-9]+)*$/;

export function slugSchema(label = "Slug") {
  return z
    .string()
    .trim()
    .transform((value) => value.replace(/^\/+|\/+$/g, ""))
    .pipe(
      z
        .string()
        .min(1, `${label} is required`)
        .regex(
          SLUG_PATTERN,
          `${label} must be lowercase letters, numbers, and hyphens (e.g. "gas-release-system" or "services/machine-shop")`,
        ),
    );
}

type SafeHrefOptions = {
  allowAnchor?: boolean;
  allowContact?: boolean;
  label?: string;
  /** Substituted only when the field is entirely absent from the input — must itself be a safe href. */
  defaultValue?: string;
};

/**
 * A required, click-navigable link field — wraps lib/routes.ts's
 * `isSafeHref` (reviewed/tested there; not re-implemented here) so every
 * block CTA/nav item/redirect target rejects `javascript:`, `data:`, and
 * protocol-relative URLs the same way. Empty input already fails
 * `isSafeHref` (it returns false for a blank trimmed string), so this
 * also covers the "non-empty" requirement for link fields without a
 * separate `.min(1)`.
 */
export function safeHrefSchema(options: SafeHrefOptions = {}) {
  const label = options.label ?? "Link";
  const message = `${label} must be an internal path (e.g. "/contact") or a full https:// URL — scripts and unsafe protocols aren't allowed`;
  const base = z.string().refine((value) => isSafeHref(value, options), { message });
  return options.defaultValue ? base.default(options.defaultValue) : base;
}

/** Optional counterpart of safeHrefSchema — "" and undefined normalize to `null`, a set value must still be safe. */
export function optionalSafeHrefSchema(options: Omit<SafeHrefOptions, "defaultValue"> = {}) {
  const label = options.label ?? "Link";
  const message = `${label} must be an internal path (e.g. "/contact") or a full https:// URL — scripts and unsafe protocols aren't allowed`;
  return z.preprocess(
    emptyStringToNull,
    z
      .string()
      .refine((value) => isSafeHref(value, options), { message })
      .nullable()
      .default(null),
  );
}

/**
 * Turns the first Zod issue of a failed parse into a `{ field, message }`
 * pair suitable for a SaveResult-shaped action return: `field` is the
 * dotted issue path (e.g. "category_id", "benefits.0.title"), and
 * `message` embeds it inline (e.g. "benefits.0.title: Benefit title is
 * required") so the error is actionable in plain text today, ahead of
 * the later task that uses `field` to scroll to/focus the control.
 */
export function formatZodError(error: z.ZodError): { message: string; field?: string } {
  const issue = error.issues[0];
  if (!issue) return { message: "Invalid input." };
  const field = issue.path.length > 0 ? issue.path.join(".") : undefined;
  return { message: field ? `${field}: ${issue.message}` : issue.message, field };
}

/** Postgres unique_violation (23505) — thrown as-is by every `lib/data/*` function that just does `if (error) throw error;`. */
export function isUniqueViolationError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "23505";
}
