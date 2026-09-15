import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FormBlockClient } from "@/components/blocks/form-client";
import type { FormBlockData } from "@/components/blocks/form";
import type { Tables } from "@/lib/db/database.types";

afterEach(cleanup);

/**
 * Render test for the Task 10 generic form block's interactive half
 * (FormBlockClient in form-client.tsx — split out of form.tsx per the
 * block registry's client/server file-split rule). Covers: every
 * FORM_FIELD_TYPES variant actually renders the right control, the
 * hidden-page-context field is filled in from the current path
 * automatically (not left for the visitor to fill in), and a submission
 * is dispatched through the bound submitFormAction with this block's
 * formKey.
 */
const { mockUsePathname } = vi.hoisted(() => ({ mockUsePathname: vi.fn(() => "/contact-alt") }));
vi.mock("next/navigation", () => ({ usePathname: mockUsePathname }));

const { mockSubmitFormAction } = vi.hoisted(() => ({
  // Named (unused) params so vi.fn infers the real 3-arg call signature —
  // `.mock.calls[0][0]` below needs that arity to type-check.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mockSubmitFormAction: vi.fn(async (formKey: string, prevState: unknown, formData: FormData) => ({
    status: "success" as const,
  })),
}));
vi.mock("@/lib/actions/submit-form", () => ({
  submitFormAction: mockSubmitFormAction,
}));

const blockData: FormBlockData = {
  background: "navy",
  spacingTop: "md",
  spacingBottom: "md",
  formKey: "quote-request",
  title: "Request a quote",
};

const definition: Tables<"form_definitions"> = {
  id: "f1",
  name: "Quote request",
  form_key: "quote-request",
  status: "published",
  submit_label: "Send request",
  success_message: "Thanks — we'll follow up shortly.",
  notification_email: "sales@example.com",
  fields: [
    { key: "full_name", label: "Full name", type: "text", required: true, placeholder: "", options: [] },
    { key: "email", label: "Work email", type: "email", required: true, placeholder: "", options: [] },
    { key: "notes", label: "Notes", type: "textarea", required: false, placeholder: "", options: [] },
    { key: "topic", label: "Topic", type: "select", required: true, placeholder: "Choose one", options: ["Sales", "Support"] },
    { key: "consent", label: "I agree to be contacted", type: "checkbox-consent", required: true, placeholder: "", options: [] },
    { key: "source_page", label: "Source page", type: "hidden-page-context", required: false, placeholder: "", options: [] },
  ],
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  updated_by: null,
};

beforeEach(() => {
  mockSubmitFormAction.mockClear();
});

describe("FormBlockClient", () => {
  it("renders one control per configured field, matching its type", () => {
    render(<FormBlockClient data={blockData} definition={definition} />);

    expect(screen.getByPlaceholderText("Full name")).toHaveAttribute("type", "text");
    expect(screen.getByPlaceholderText("Work email")).toHaveAttribute("type", "email");
    expect(screen.getByPlaceholderText("Notes").tagName).toBe("TEXTAREA");
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByLabelText("I agree to be contacted")).toHaveAttribute("type", "checkbox");
    expect(screen.getByRole("button", { name: "Send request" })).toBeInTheDocument();
  });

  it("gives every visible field a real accessible name, not just a placeholder", () => {
    render(<FormBlockClient data={blockData} definition={definition} />);

    expect(screen.getByLabelText("Full name")).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Work email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Notes").tagName).toBe("TEXTAREA");
    expect(screen.getByLabelText("Topic").tagName).toBe("SELECT");
  });

  it("fills the hidden-page-context field from the current pathname, not left blank for the visitor", () => {
    const { container } = render(<FormBlockClient data={blockData} definition={definition} />);
    const hidden = container.querySelector('input[name="source_page"]');
    expect(hidden).toHaveAttribute("type", "hidden");
    expect(hidden).toHaveValue("contact-alt");
  });

  it("submits through submitFormAction bound to this block's formKey, and shows the definition's success message", async () => {
    render(<FormBlockClient data={blockData} definition={definition} />);

    fireEvent.change(screen.getByPlaceholderText("Full name"), { target: { value: "Ada Lovelace" } });
    fireEvent.change(screen.getByPlaceholderText("Work email"), { target: { value: "ada@example.com" } });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Sales" } });
    fireEvent.click(screen.getByLabelText("I agree to be contacted"));
    fireEvent.click(screen.getByRole("button", { name: "Send request" }));

    await waitFor(() => expect(mockSubmitFormAction).toHaveBeenCalledTimes(1));
    expect(mockSubmitFormAction.mock.calls[0][0]).toBe("quote-request");

    expect(await screen.findByText("Thanks — we'll follow up shortly.")).toBeInTheDocument();
  });
});
