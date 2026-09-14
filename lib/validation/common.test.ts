import { describe, expect, it } from "vitest";
import {
  emptyStringToNull,
  formatZodError,
  optionalNullableNumber,
  optionalNullableString,
  optionalSafeHrefSchema,
  requiredString,
  safeHrefSchema,
  slugSchema,
} from "@/lib/validation/common";
import { z } from "zod";

describe("emptyStringToNull", () => {
  it("normalizes a blank or whitespace-only string to null", () => {
    expect(emptyStringToNull("")).toBeNull();
    expect(emptyStringToNull("   ")).toBeNull();
  });

  it("trims and keeps a non-blank string", () => {
    expect(emptyStringToNull("  hi  ")).toBe("hi");
  });

  it("passes through non-string values untouched", () => {
    expect(emptyStringToNull(null)).toBeNull();
    expect(emptyStringToNull(undefined)).toBeUndefined();
    expect(emptyStringToNull(42)).toBe(42);
  });
});

describe("requiredString", () => {
  it("rejects blank/whitespace-only input with a field-named message", () => {
    const schema = requiredString("Title");
    expect(schema.safeParse("").success).toBe(false);
    expect(schema.safeParse("   ").success).toBe(false);
    expect(schema.safeParse("  ").error?.issues[0]?.message).toBe("Title is required");
  });

  it("accepts and trims a real value", () => {
    expect(requiredString("Title").parse("  Hello  ")).toBe("Hello");
  });
});

describe("optionalNullableString", () => {
  it("normalizes '' and undefined to null instead of leaving them undefined", () => {
    const schema = optionalNullableString();
    expect(schema.parse("")).toBeNull();
    expect(schema.parse(undefined)).toBeNull();
    expect(schema.parse("  hi  ")).toBe("hi");
  });
});

describe("optionalNullableNumber", () => {
  it("normalizes '' and undefined to null and enforces bounds", () => {
    const schema = optionalNullableNumber(-90, 90);
    expect(schema.parse("")).toBeNull();
    expect(schema.parse(undefined)).toBeNull();
    expect(schema.parse(45)).toBe(45);
    expect(schema.safeParse(200).success).toBe(false);
  });
});

describe("slugSchema", () => {
  const slug = slugSchema("Slug");

  it("accepts a plain lowercase-hyphenated slug", () => {
    expect(slug.parse("gas-release-system")).toBe("gas-release-system");
  });

  it("strips leading/trailing slashes and accepts one level of nesting", () => {
    expect(slug.parse("/services/machine-shop/")).toBe("services/machine-shop");
  });

  it("rejects a blank slug", () => {
    const result = slug.safeParse("   ");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Slug is required");
  });

  it("rejects uppercase, spaces, and other unsafe characters", () => {
    expect(slug.safeParse("Gas Release").success).toBe(false);
    expect(slug.safeParse("gas_release!").success).toBe(false);
  });
});

describe("safeHrefSchema", () => {
  it("accepts a real internal path and a full https:// URL", () => {
    const schema = safeHrefSchema();
    expect(schema.parse("/contact")).toBe("/contact");
    expect(schema.parse("https://osi.example/file.pdf")).toBe("https://osi.example/file.pdf");
  });

  it("rejects javascript:, data:, protocol-relative, and blank hrefs", () => {
    const schema = safeHrefSchema();
    expect(schema.safeParse("javascript:alert(1)").success).toBe(false);
    expect(schema.safeParse("data:text/html,bad").success).toBe(false);
    expect(schema.safeParse("//evil.example").success).toBe(false);
    expect(schema.safeParse("").success).toBe(false);
  });

  it("only accepts an anchor link when allowAnchor is set", () => {
    expect(safeHrefSchema().safeParse("#details").success).toBe(false);
    expect(safeHrefSchema({ allowAnchor: true }).safeParse("#details").success).toBe(true);
  });

  it("only accepts mailto:/tel: when allowContact is set", () => {
    expect(safeHrefSchema().safeParse("mailto:hello@osi.example").success).toBe(false);
    expect(safeHrefSchema({ allowContact: true }).safeParse("mailto:hello@osi.example").success).toBe(true);
  });

  it("substitutes defaultValue only when the field is entirely absent", () => {
    const schema = safeHrefSchema({ defaultValue: "/contact" });
    expect(schema.parse(undefined)).toBe("/contact");
  });
});

describe("optionalSafeHrefSchema", () => {
  it("normalizes '' and undefined to null", () => {
    const schema = optionalSafeHrefSchema();
    expect(schema.parse("")).toBeNull();
    expect(schema.parse(undefined)).toBeNull();
  });

  it("still rejects an unsafe value when one is set", () => {
    expect(optionalSafeHrefSchema().safeParse("javascript:alert(1)").success).toBe(false);
  });
});

describe("formatZodError", () => {
  it("embeds the dotted field path in the message", () => {
    const schema = z.object({ benefits: z.array(z.object({ title: z.string().min(1, "Benefit title is required") })) });
    const result = schema.safeParse({ benefits: [{ title: "" }] });
    expect(result.success).toBe(false);
    const { message, field } = formatZodError(result.error!);
    expect(field).toBe("benefits.0.title");
    expect(message).toBe("benefits.0.title: Benefit title is required");
  });

  it("omits the field prefix for a root-level issue", () => {
    const schema = z.string().min(1, "Required");
    const result = schema.safeParse("");
    const { message, field } = formatZodError(result.error!);
    expect(field).toBeUndefined();
    expect(message).toBe("Required");
  });
});
