import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MediaBrowser } from "@/components/admin/media/media-browser";
import type { MediaAsset } from "@/lib/actions/media";

/**
 * Task 11: MediaBrowser is the shared grid/card/search/empty/loading
 * component extracted out of media-picker.tsx and media-library.tsx —
 * this covers its core states directly, mocking the server actions it
 * calls (lib/actions/media.ts) rather than a real DB.
 */
const { listMediaAction, listMediaFoldersAction, listMediaTagsAction, uploadMediaAction, updateMediaMetadataAction } =
  vi.hoisted(() => ({
    listMediaAction: vi.fn(),
    listMediaFoldersAction: vi.fn(),
    listMediaTagsAction: vi.fn(),
    uploadMediaAction: vi.fn(),
    updateMediaMetadataAction: vi.fn(),
  }));

vi.mock("@/lib/actions/media", () => ({
  listMediaAction,
  listMediaFoldersAction,
  listMediaTagsAction,
  uploadMediaAction,
  updateMediaMetadataAction,
}));

afterEach(cleanup);

function makeAsset(overrides: Partial<MediaAsset> = {}): MediaAsset {
  return {
    id: "asset-1",
    url: "https://example.test/photo.jpg",
    alt: "A photo",
    title: "Photo",
    filename: "photo.jpg",
    mime: "image/jpeg",
    source: "uploaded",
    folder: null,
    tags: [],
    caption: null,
    credit: null,
    decorative: false,
    width: null,
    height: null,
    file_size: null,
    replaced_by: null,
    replaced_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

beforeEach(() => {
  listMediaFoldersAction.mockReset().mockResolvedValue([]);
  listMediaTagsAction.mockReset().mockResolvedValue([]);
  listMediaAction.mockReset();
  uploadMediaAction.mockReset();
  updateMediaMetadataAction.mockReset();
});

describe("MediaBrowser", () => {
  it("shows a loading state while the initial fetch is in flight, then clears it once resolved", async () => {
    let resolveList: (value: unknown) => void = () => {};
    listMediaAction.mockReturnValue(
      new Promise((resolve) => {
        resolveList = resolve;
      }),
    );

    render(<MediaBrowser />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();

    await act(async () => {
      resolveList({ assets: [], total: 0 });
    });

    await waitFor(() => expect(screen.queryByText("Loading…")).toBeNull());
  });

  it("shows the empty-state message once loaded with no assets", async () => {
    listMediaAction.mockResolvedValue({ assets: [], total: 0 });
    render(<MediaBrowser emptyMessage="Nothing here yet." />);
    await waitFor(() => expect(screen.getByText("Nothing here yet.")).toBeInTheDocument());
  });

  it("falls back to a generic empty-state message when none is given", async () => {
    listMediaAction.mockResolvedValue({ assets: [], total: 0 });
    render(<MediaBrowser />);
    await waitFor(() => expect(screen.getByText("No media found.")).toBeInTheDocument());
  });

  it("renders one card per asset and the pagination summary once loaded", async () => {
    listMediaAction.mockResolvedValue({
      assets: [makeAsset({ id: "a1", title: "Hero" }), makeAsset({ id: "a2", title: "Diagram" })],
      total: 2,
    });
    render(<MediaBrowser />);
    await waitFor(() => expect(screen.getByText("Hero")).toBeInTheDocument());
    expect(screen.getByText("Diagram")).toBeInTheDocument();
    expect(screen.getByText("1–2 of 2")).toBeInTheDocument();
  });

  it("calls onSelect with the full asset when a card's thumbnail is clicked (picker mode)", async () => {
    const asset = makeAsset({ id: "a1", title: "Hero", alt: "Hero photo" });
    listMediaAction.mockResolvedValue({ assets: [asset], total: 1 });
    const onSelect = vi.fn();
    render(<MediaBrowser onSelect={onSelect} />);

    // The card's title text ("Hero") and its thumbnail button's `title`
    // attribute collide, so this targets the button by its accessible
    // name instead — the <img>'s alt text, since the button has no other
    // text content.
    const thumbnailButton = await screen.findByRole("button", { name: "Hero photo" });
    fireEvent.click(thumbnailButton);
    expect(onSelect).toHaveBeenCalledWith(asset);
  });

  it("requests the 'document' kind when accept='file'", async () => {
    listMediaAction.mockResolvedValue({ assets: [], total: 0 });
    render(<MediaBrowser accept="file" />);
    await waitFor(() => expect(listMediaAction).toHaveBeenCalled());
    expect(listMediaAction).toHaveBeenCalledWith(expect.objectContaining({ kind: "document" }));
  });

  it("requests the 'model' kind when accept='model'", async () => {
    listMediaAction.mockResolvedValue({ assets: [], total: 0 });
    render(<MediaBrowser accept="model" />);
    await waitFor(() => expect(listMediaAction).toHaveBeenCalled());
    expect(listMediaAction).toHaveBeenCalledWith(expect.objectContaining({ kind: "model" }));
  });

  it("sets the upload file input's accept to model extensions when accept='model'", async () => {
    listMediaAction.mockResolvedValue({ assets: [], total: 0 });
    render(<MediaBrowser accept="model" />);
    await waitFor(() => expect(listMediaAction).toHaveBeenCalled());
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput.accept).toBe(".glb,.usdz");
  });

  it("gives the native file chooser a prominent, reusable admin style", async () => {
    listMediaAction.mockResolvedValue({ assets: [], total: 0 });
    render(<MediaBrowser accept="file" />);
    await waitFor(() => expect(listMediaAction).toHaveBeenCalled());

    expect(document.querySelector('input[type="file"]')).toHaveClass("admin-file-input");
  });

  it("shows a GLB badge (not an <img>) for a model asset", async () => {
    listMediaAction.mockResolvedValue({
      assets: [makeAsset({ id: "a1", title: "Gas Release System", mime: "model/gltf-binary", filename: "model.glb" })],
      total: 1,
    });
    render(<MediaBrowser />);
    await waitFor(() => expect(screen.getByText("Gas Release System")).toBeInTheDocument());
    expect(screen.getByText("GLB")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("renders a library-mode footer via renderCardFooter without making the card itself selectable", async () => {
    listMediaAction.mockResolvedValue({ assets: [makeAsset({ id: "a1", title: "Hero" })], total: 1 });
    render(<MediaBrowser renderCardFooter={(asset) => <button type="button">{`Delete ${asset.title}`}</button>} />);
    await waitFor(() => expect(screen.getByText("Delete Hero")).toBeInTheDocument());
    // No onSelect was passed, so the thumbnail is a plain (non-button) container.
    expect(screen.queryByRole("button", { name: "Hero" })).toBeNull();
  });
});
