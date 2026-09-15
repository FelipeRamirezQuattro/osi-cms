import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ImageGalleryClient } from "@/components/blocks/image-gallery-client";

afterEach(cleanup);

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

describe("ImageGalleryClient", () => {
  const images = [
    { url: "/gallery/pump.jpg", alt: "Pump assembly" },
    { url: "/gallery/workshop.jpg", alt: "OSI workshop" },
  ];

  it("opens an accessible dialog and supports keyboard navigation", () => {
    render(<ImageGalleryClient images={images} />);

    fireEvent.click(screen.getByRole("button", { name: /open image 1 of 2/i }));
    const dialog = screen.getByRole("dialog", { name: "Image gallery" });

    expect(dialog).toHaveAttribute("open");
    expect(screen.getByText("Pump assembly · 1 of 2")).toBeInTheDocument();

    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(screen.getByText("OSI workshop · 2 of 2")).toBeInTheDocument();
  });

  it("closes from the visible close control", () => {
    render(<ImageGalleryClient images={images} />);
    fireEvent.click(screen.getByRole("button", { name: /open image 1 of 2/i }));
    const dialog = screen.getByRole("dialog", { name: "Image gallery" });

    fireEvent.click(screen.getByRole("button", { name: "Close gallery" }));
    expect(dialog).not.toHaveAttribute("open");
  });
});
