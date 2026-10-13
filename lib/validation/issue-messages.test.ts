import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { FieldSpec } from "@/lib/blocks/admin-fields";
import { describeIssue } from "@/lib/validation/issue-messages";

function firstIssue(schema: z.ZodType, input: unknown) {
  const result = schema.safeParse(input);
  if (result.success) throw new Error("expected failure");
  return result.error.issues[0];
}

const specs: FieldSpec[] = [
  { key: "items", label: "Stats", type: "array", itemFields: [{ key: "value", label: "Number", type: "text" }] },
  { key: "link", label: "Link", type: "text" },
  { key: "variant", label: "Style", type: "select", options: ["a", "b"] },
  { key: "count", label: "Count", type: "number" },
];

describe("describeIssue", () => {
  it("too_small array: includes the minimum and what the editor has", () => {
    const issue = firstIssue(z.object({ items: z.array(z.string()).min(2) }), { items: ["x"] });
    expect(describeIssue(issue, { specs, data: { items: ["x"] } })).toBe("add at least 2 stats (you have 1).");
  });

  it("too_big array", () => {
    const issue = firstIssue(z.object({ items: z.array(z.string()).max(2) }), { items: ["a", "b", "c"] });
    expect(describeIssue(issue, { specs, data: { items: ["a", "b", "c"] } })).toBe("use at most 2 stats (you have 3).");
  });

  it("missing required value (invalid_type with no value)", () => {
    const issue = firstIssue(z.object({ link: z.string() }), {});
    expect(describeIssue(issue, { specs, data: {} })).toBe("Link is required.");
  });

  it("invalid URL", () => {
    const issue = firstIssue(z.object({ link: z.url() }), { link: "nope" });
    expect(describeIssue(issue, { specs, data: { link: "nope" } })).toMatch(/Link must be a valid web address/);
  });

  it("invalid enum value lists the options", () => {
    const issue = firstIssue(z.object({ variant: z.enum(["a", "b"]) }), { variant: "z" });
    expect(describeIssue(issue, { specs, data: { variant: "z" } })).toBe("Style must be one of: a, b.");
  });

  it("number bounds", () => {
    const issue = firstIssue(z.object({ count: z.number().min(1) }), { count: 0 });
    expect(describeIssue(issue, { specs, data: { count: 0 } })).toBe("Count must be 1 or more.");
  });

  it("adds item context for fields inside a repeated item", () => {
    const schema = z.object({ items: z.array(z.object({ value: z.string() })) });
    const issue = firstIssue(schema, { items: [{ value: "1" }, {}] });
    expect(describeIssue(issue, { specs, data: { items: [{ value: "1" }, {}] } })).toBe(
      "Number is required (Stats, item 2).",
    );
  });

  it("keeps a message the schema author wrote on purpose", () => {
    const issue = firstIssue(z.object({ link: z.string().min(1, "Link is needed for this button") }), { link: "" });
    expect(describeIssue(issue, { specs })).toBe("Link is needed for this button");
  });
});
