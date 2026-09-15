import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { FormBlockRender } from "@/components/blocks/form";
import type { FormBlockData } from "@/components/blocks/form";

afterEach(cleanup);

const { mockGetPublishedFormDefinitionByKey } = vi.hoisted(() => ({
  mockGetPublishedFormDefinitionByKey: vi.fn(),
}));
vi.mock("@/lib/data/forms", () => ({
  getPublishedFormDefinitionByKey: mockGetPublishedFormDefinitionByKey,
}));

// FormBlockClient pulls in useActionState/usePathname — irrelevant to what
// this test checks (the server-side "form not found" branch never reaches
// it), so it's stubbed out rather than exercised here.
vi.mock("@/components/blocks/form-client", () => ({
  FormBlockClient: () => <div data-testid="form-block-client" />,
}));

const data: FormBlockData = {
  background: "navy",
  spacingTop: "md",
  spacingBottom: "md",
  formKey: "missing-form",
  title: undefined,
};

beforeEach(() => {
  mockGetPublishedFormDefinitionByKey.mockReset();
});

describe("FormBlockRender", () => {
  it("renders a diagnostic (not a crash) when the form key has no published definition", async () => {
    mockGetPublishedFormDefinitionByKey.mockResolvedValue(null);

    const element = await FormBlockRender({ data });
    render(element);

    expect(screen.getByText(/not found or not published/i)).toBeInTheDocument();
    expect(screen.queryByTestId("form-block-client")).toBeNull();
  });

  it("delegates to FormBlockClient once a published definition is found", async () => {
    mockGetPublishedFormDefinitionByKey.mockResolvedValue({ id: "f1", form_key: "missing-form" });

    const element = await FormBlockRender({ data });
    render(element);

    expect(screen.getByTestId("form-block-client")).toBeInTheDocument();
  });
});
