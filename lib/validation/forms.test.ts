import { describe, expect, it } from "vitest";
import { contactFormSchema } from "@/lib/validation/forms";

describe("contactFormSchema", () => {
  const valid = {
    firstName: "Ada",
    lastName: "Min",
    email: "ada@example.com",
    phone: "555-1234",
    message: "Interested in a quote.",
  };

  it("accepts a complete, valid submission", () => {
    expect(contactFormSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a missing required field or a malformed email", () => {
    expect(contactFormSchema.safeParse({ ...valid, firstName: "" }).success).toBe(false);
    expect(contactFormSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
    expect(contactFormSchema.safeParse({ ...valid, message: "" }).success).toBe(false);
  });

  it("accepts the honeypot field empty and rejects it filled in", () => {
    expect(contactFormSchema.safeParse({ ...valid, website: "" }).success).toBe(true);
    expect(contactFormSchema.safeParse({ ...valid, website: "spam" }).success).toBe(false);
  });
});
