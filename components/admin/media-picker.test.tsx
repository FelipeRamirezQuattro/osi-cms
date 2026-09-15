import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MediaPicker } from "@/components/admin/media-picker";

/**
 * Task 11 review fix: MediaPicker's <dialog> (and everything inside it) is
 * portaled to document.body unconditionally on mount, but MediaBrowser
 * itself must only render once the dialog is actually opened — it fires
 * three server actions (list/folders/tags) as soon as it mounts, and a
 * page with several pickers (e.g. the product editor) previously fired
 * all of those on every page load regardless of whether any picker was
 * ever opened.
 */
const { mockMediaBrowser } = vi.hoisted(() => ({ mockMediaBrowser: vi.fn() }));
vi.mock("@/components/admin/media/media-browser", () => ({
  MediaBrowser: (props: unknown) => {
    mockMediaBrowser(props);
    return null;
  },
}));

afterEach(cleanup);
beforeEach(() => {
  mockMediaBrowser.mockClear();
  // jsdom doesn't implement <dialog>'s showModal/close — HTMLDialogElement
  // ships as an unimplemented stub, so tests drive `open`/state directly.
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

describe("MediaPicker", () => {
  it("does not render MediaBrowser (and its list/folders/tags fetches) until opened", () => {
    render(<MediaPicker value={undefined} onChange={() => {}} />);
    expect(mockMediaBrowser).not.toHaveBeenCalled();
  });

  it("renders MediaBrowser once the picker button is clicked", () => {
    render(<MediaPicker value={undefined} onChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /choose image/i }));
    expect(mockMediaBrowser).toHaveBeenCalled();
  });
});
