import type { z } from "zod";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

/**
 * Turns Zod issues into plain-English sentences an editor can act on,
 * using each field's *admin label* (from `FieldSpec[]`) instead of the
 * schema's internal key. Only Zod's own boilerplate ("Too small: expected
 * array to have >=2 items") is rewritten — a message a schema author wrote
 * on purpose ("3D model (.glb) is required") is already good English and
 * is kept verbatim.
 */
type Issue = z.ZodError["issues"][number];
type PathSegment = Issue["path"][number];

const ZOD_DEFAULT_MESSAGE = /^(Too small|Too big|Invalid)/;

function humanizeKey(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Walks `path` through the specs; returns the leaf label plus any parent context ("Stats, item 2"). */
function describePath(path: readonly PathSegment[], specs?: FieldSpec[]): { label: string; context?: string } {
  const tokens: { text: string; isField: boolean }[] = [];
  let current: FieldSpec[] | undefined = specs;
  for (const segment of path) {
    if (typeof segment === "number") {
      tokens.push({ text: `item ${segment + 1}`, isField: false });
      continue;
    }
    const spec: FieldSpec | undefined = current?.find((s) => s.key === segment);
    tokens.push({ text: spec?.label ?? humanizeKey(String(segment)), isField: true });
    current = spec?.type === "array" ? spec.itemFields : spec?.type === "object" ? spec.fields : undefined;
  }
  const leafIndex = tokens.map((t) => t.isField).lastIndexOf(true);
  if (leafIndex === -1) return { label: "This field" };
  const context = tokens.slice(0, leafIndex).map((t) => t.text).join(", ");
  return { label: tokens[leafIndex].text, context: context || undefined };
}

function valueAt(data: unknown, path: readonly PathSegment[]): unknown {
  let current: unknown = data;
  for (const segment of path) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<PathSegment, unknown>)[segment];
  }
  return current;
}

function lengthOf(value: unknown): number | undefined {
  if (Array.isArray(value)) return value.length;
  if (typeof value === "string") return value.length;
  return undefined;
}

function plural(label: string): string {
  return label.toLowerCase();
}

export function describeIssue(issue: Issue, options: { specs?: FieldSpec[]; data?: unknown } = {}): string {
  if (!ZOD_DEFAULT_MESSAGE.test(issue.message)) {
    // A deliberately written message — keep it, adding context only when it sits inside a repeated item.
    return issue.message;
  }
  const { label, context } = describePath(issue.path, options.specs);
  const where = context ? ` (${context})` : "";
  const value = valueAt(options.data, issue.path);
  const found = lengthOf(value);

  switch (issue.code) {
    case "too_small": {
      const min = Number(issue.minimum);
      if (issue.origin === "array") {
        return `add at least ${min} ${plural(label)}${found !== undefined ? ` (you have ${found})` : ""}${where}.`;
      }
      if (issue.origin === "string") {
        return min <= 1 ? `${label} is required${where}.` : `${label} must be at least ${min} characters${where}.`;
      }
      return `${label} must be ${min} or more${where}.`;
    }
    case "too_big": {
      const max = Number(issue.maximum);
      if (issue.origin === "array") {
        return `use at most ${max} ${plural(label)}${found !== undefined ? ` (you have ${found})` : ""}${where}.`;
      }
      if (issue.origin === "string") return `${label} must be ${max} characters or fewer${where}.`;
      return `${label} must be ${max} or less${where}.`;
    }
    case "invalid_type": {
      if (value === undefined || value === null || value === "") return `${label} is required${where}.`;
      return `${label} isn't in the expected format (expected ${String(issue.expected)})${where}.`;
    }
    case "invalid_format": {
      if (issue.format === "url") return `${label} must be a valid web address (e.g. https://example.com)${where}.`;
      if (issue.format === "email") return `${label} must be a valid email address${where}.`;
      return `${label} isn't in the expected format${where}.`;
    }
    case "invalid_value": {
      const values = Array.isArray(issue.values) ? issue.values.map(String).join(", ") : "";
      return values ? `${label} must be one of: ${values}${where}.` : `${label} has an invalid value${where}.`;
    }
    default:
      return `${label} is invalid${where}.`;
  }
}

/** Dotted path used to focus the failing control in the editor. */
export function issueField(issue: Issue): string | undefined {
  return issue.path.length > 0 ? issue.path.join(".") : undefined;
}
