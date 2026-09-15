import { describe, expect, it } from "vitest";
import {
  buildDynamicFormSchema,
  contactFormSchema,
  formDefinitionSchema,
  formFieldDefinitionSchema,
} from "@/lib/validation/forms";

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

describe("formFieldDefinitionSchema", () => {
  it("accepts a well-formed text field", () => {
    const result = formFieldDefinitionSchema.safeParse({
      key: "full_name",
      label: "Full name",
      type: "text",
      required: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a select field with no options", () => {
    const result = formFieldDefinitionSchema.safeParse({
      key: "topic",
      label: "Topic",
      type: "select",
      required: true,
      options: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a field key that isn't a safe identifier", () => {
    const result = formFieldDefinitionSchema.safeParse({
      key: "full name!",
      label: "Full name",
      type: "text",
    });
    expect(result.success).toBe(false);
  });
});

describe("formDefinitionSchema", () => {
  const base = {
    name: "Quote request",
    form_key: "quote-request",
    status: "draft" as const,
    submit_label: "Submit",
    success_message: "Thanks!",
    notification_email: "",
    fields: [
      { key: "email", label: "Email", type: "email" as const, required: true },
      { key: "message", label: "Message", type: "textarea" as const, required: true },
    ],
  };

  it("accepts a well-formed definition", () => {
    expect(formDefinitionSchema.safeParse(base).success).toBe(true);
  });

  it("normalizes a blank notification_email to null", () => {
    const result = formDefinitionSchema.parse(base);
    expect(result.notification_email).toBeNull();
  });

  it("rejects duplicate field keys", () => {
    const result = formDefinitionSchema.safeParse({
      ...base,
      fields: [
        { key: "email", label: "Email", type: "email", required: true },
        { key: "email", label: "Work email", type: "email", required: false },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a form_key with uppercase letters or spaces", () => {
    expect(formDefinitionSchema.safeParse({ ...base, form_key: "Quote Request" }).success).toBe(false);
  });
});

describe("buildDynamicFormSchema", () => {
  const fields = [
    { key: "full_name", label: "Full name", type: "text" as const, required: true, placeholder: "", options: [] },
    { key: "email", label: "Email", type: "email" as const, required: true, placeholder: "", options: [] },
    { key: "notes", label: "Notes", type: "textarea" as const, required: false, placeholder: "", options: [] },
    {
      key: "topic",
      label: "Topic",
      type: "select" as const,
      required: true,
      placeholder: "",
      options: ["Sales", "Support"],
    },
    {
      key: "consent",
      label: "I agree to be contacted",
      type: "checkbox-consent" as const,
      required: true,
      placeholder: "",
      options: [],
    },
    { key: "source_page", label: "Source page", type: "hidden-page-context" as const, required: false, placeholder: "", options: [] },
  ];
  const schema = buildDynamicFormSchema(fields);

  const validSubmission = {
    full_name: "Ada Lovelace",
    email: "ada@example.com",
    notes: "",
    topic: "Sales",
    consent: "on",
    source_page: "products/gas-release-system",
  };

  it("accepts a fully valid submission", () => {
    const result = schema.safeParse(validSubmission);
    expect(result.success).toBe(true);
  });

  it("rejects a missing required text field", () => {
    const result = schema.safeParse({ ...validSubmission, full_name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email address", () => {
    const result = schema.safeParse({ ...validSubmission, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects a select value outside the configured options", () => {
    const result = schema.safeParse({ ...validSubmission, topic: "Something else" });
    expect(result.success).toBe(false);
  });

  it("rejects an unchecked required consent checkbox", () => {
    const result = schema.safeParse({ ...validSubmission, consent: undefined });
    expect(result.success).toBe(false);
  });

  it("accepts an absent optional textarea and normalizes it to null", () => {
    const { notes, ...withoutNotes } = validSubmission;
    void notes;
    const result = schema.safeParse(withoutNotes);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.notes).toBeNull();
  });

  it("always validates the honeypot field, defaulting to a passing empty value", () => {
    const result = schema.safeParse(validSubmission);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.website).toBeUndefined();
  });

  it("fails when the honeypot field is filled in (bot behavior)", () => {
    const result = schema.safeParse({ ...validSubmission, website: "http://spam.example" });
    expect(result.success).toBe(false);
  });
});
