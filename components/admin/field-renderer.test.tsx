import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { FieldRenderer } from "@/components/admin/field-renderer";

afterEach(cleanup);

function StatusFieldHarness() {
  const form = useForm({ defaultValues: { status: "draft" } });
  return (
    <FormProvider {...form}>
      <FieldRenderer
        name="status"
        spec={{ key: "status", label: "Status", type: "select", options: ["draft", "published", "archived"] }}
      />
    </FormProvider>
  );
}

describe("FieldRenderer", () => {
  it("renders the status selector with the larger status-control treatment", () => {
    render(<StatusFieldHarness />);
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveClass("admin-status-select");
  });
});
