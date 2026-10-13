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

function RelationHarness({ type, relation }: { type: "relation" | "multi-relation"; relation: string }) {
  const form = useForm({ defaultValues: { f: type === "relation" ? "" : [] } });
  return (
    <FormProvider {...form}>
      <FieldRenderer name="f" spec={{ key: "f", label: "Applications", type, relation }} />
    </FormProvider>
  );
}

describe("FieldRenderer relation empty states (CAT-04)", () => {
  it("tells the editor where to create the records, with a link", () => {
    render(<RelationHarness type="multi-relation" relation="applications" />);
    expect(screen.getByText(/No applications yet — create them in/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Applications →/ })).toHaveAttribute("href", "/admin/applications");
  });

  it("does the same for a single-select relation", () => {
    render(<RelationHarness type="relation" relation="shared-sections" />);
    expect(screen.getByRole("link", { name: /Shared sections →/ })).toHaveAttribute("href", "/admin/shared-sections");
  });

  it("falls back to a plain message for relations with no admin section", () => {
    render(<RelationHarness type="multi-relation" relation="related_products" />);
    expect(screen.getByText("No options available.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
