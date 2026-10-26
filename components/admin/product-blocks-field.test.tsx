import { createRef } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { ProductBlocksField, type ProductBlocksHandle } from "@/components/admin/product-blocks-field";
import { PublishedBrandingOptionsProvider } from "@/components/admin/block-appearance-fields";
import { OSI_SEED_BRANDING_CONFIG } from "@/lib/branding/seed";
import { getBlockPalette } from "@/lib/blocks/registry";

Element.prototype.scrollIntoView = () => {}; // jsdom doesn't implement it
afterEach(cleanup);

const palette = getBlockPalette();
const heading = palette.find((p) => p.type === "section_heading")!;

function Harness({ handle }: { handle: React.RefObject<ProductBlocksHandle | null> }) {
  const form = useForm({
    defaultValues: {
      blocks: [
        { type: "section_heading", is_visible: true, data: { ...(heading.defaults as object), title: "First" } },
        { type: "section_heading", is_visible: true, data: { ...(heading.defaults as object), title: "Second" } },
      ],
    },
  });
  return (
    <PublishedBrandingOptionsProvider branding={OSI_SEED_BRANDING_CONFIG}>
      <FormProvider {...form}>
        <ProductBlocksField ref={handle as React.Ref<ProductBlocksHandle>} palette={palette} />
        <output data-testid="types">{JSON.stringify(form.watch("blocks").map((b: { data: { title: string }; is_visible: boolean }) => `${b.data.title}:${b.is_visible}`))}</output>
      </FormProvider>
    </PublishedBrandingOptionsProvider>
  );
}

describe("ProductBlocksField", () => {
  it("lists the product's blocks and lets the editor hide, reorder and remove them", () => {
    render(<Harness handle={createRef()} />);
    expect(document.querySelectorAll("[data-block-row]")).toHaveLength(2);

    fireEvent.click(screen.getAllByRole("button", { name: "Hide" })[0]);
    expect(screen.getByTestId("types")).toHaveTextContent('"First:false"');
    expect(screen.getByText("(hidden)")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /move .* down/i })[0]);
    expect(screen.getByTestId("types")).toHaveTextContent('["Second:true","First:false"]');

    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]);
    expect(screen.getByTestId("types")).toHaveTextContent('["First:false"]');
  });

  it("reveal() opens the block a save problem points at and outlines it", async () => {
    const handle = createRef<ProductBlocksHandle>();
    render(<Harness handle={handle} />);
    expect(document.querySelector("[data-block-fields]")).toBeNull();
    await act(async () => {
      handle.current!.reveal({ blockIndex: 1, field: "title" });
    });
    const rows = document.querySelectorAll("[data-block-row]");
    expect(rows[1].querySelector("[data-block-fields]")).not.toBeNull();
    expect(rows[1]).toHaveAttribute("data-block-invalid", "true");
  });
});

describe("ProductBlocksField — linked sections", () => {
  function Types() {
    const blocks = useWatch({ name: "blocks" }) as { type: string }[];
    return <output data-testid="types">{JSON.stringify(blocks.map((b) => b.type))}</output>;
  }
  function LinkedHarness() {
    const form = useForm({
      defaultValues: {
        blocks: [
          { type: "product_specs", is_visible: true, data: { title: "Specifications", background: "cream" } },
          { type: "section_heading", is_visible: true, data: { ...(heading.defaults as object), title: "Extra" } },
        ],
      },
    });
    return (
      <PublishedBrandingOptionsProvider branding={OSI_SEED_BRANDING_CONFIG}>
        <FormProvider {...form}>
          <ProductBlocksField palette={palette} />
          <Types />
        </FormProvider>
      </PublishedBrandingOptionsProvider>
    );
  }

  it("a linked section can be hidden and moved but not removed, and says where its data is edited", () => {
    render(<LinkedHarness />);
    // Only the ordinary block offers Remove.
    expect(screen.getAllByRole("button", { name: "Remove" })).toHaveLength(1);
    expect(screen.getByText("Linked")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /move .* down/i })[0]);
    expect(screen.getByTestId("types")).toHaveTextContent('["section_heading","product_specs"]');

    fireEvent.click(document.querySelectorAll("[data-block-toggle]")[1]);
    expect(screen.getByText(/edited in the Specifications form below/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Heading \(leave empty for no heading\)/)).toBeInTheDocument();
  });
});
