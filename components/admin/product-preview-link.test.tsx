import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ProductPreviewLink } from "@/components/admin/product-preview-link";

afterEach(cleanup);

describe("ProductPreviewLink", () => {
  it("opens /preview/products/<category>/<slug> in a new tab", () => {
    render(<ProductPreviewLink categorySlug="gas-separation" slug="esp-g-force" />);
    const link = screen.getByRole("link", { name: "Preview" });
    expect(link).toHaveAttribute("href", "/preview/products/gas-separation/esp-g-force");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("explains why there is no preview until a category is saved", () => {
    render(<ProductPreviewLink categorySlug={null} slug="x" />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Preview needs a category")).toBeInTheDocument();
  });
});
