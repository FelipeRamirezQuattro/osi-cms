import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MAX_SHARED_SECTION_DEPTH, SharedSectionBlockRender } from "@/components/blocks/shared-section";

afterEach(cleanup);

/**
 * Task 10 controller ruling #2: cycle/depth protection for the
 * shared_section reference block. These tests exercise
 * SharedSectionBlockRender directly (it's a plain async function, not
 * something that needs a full page render) with the visited-key-set and
 * depth values BlockRenderer threads through — see that file's own
 * `visitedSharedSectionKeys`/`sharedSectionDepth` props.
 */
const { mockGetPublishedSharedSectionByKey } = vi.hoisted(() => ({
  mockGetPublishedSharedSectionByKey: vi.fn(),
}));
vi.mock("@/lib/data/shared-sections", () => ({
  getPublishedSharedSectionByKey: mockGetPublishedSharedSectionByKey,
}));

const baseData = { key: "footer-cta", background: "transparent" as const, spacingTop: "md" as const, spacingBottom: "md" as const };

beforeEach(() => {
  mockGetPublishedSharedSectionByKey.mockReset();
});

describe("SharedSectionBlockRender — depth guard", () => {
  it("refuses to render (without fetching) once the max nesting depth is reached", async () => {
    const element = await SharedSectionBlockRender({ data: baseData, sharedSectionDepth: MAX_SHARED_SECTION_DEPTH });
    render(element);

    expect(screen.getByText(/maximum nesting depth/i)).toBeInTheDocument();
    expect(mockGetPublishedSharedSectionByKey).not.toHaveBeenCalled();
  });

  it("still renders one level below the max depth", async () => {
    mockGetPublishedSharedSectionByKey.mockResolvedValue({
      key: "footer-cta",
      title: "Footer CTA",
      blocks: [
        { id: "b1", type: "section_heading", position: 0, is_visible: true, data: { title: "Get in touch" } },
      ],
    });

    const element = await SharedSectionBlockRender({
      data: baseData,
      sharedSectionDepth: MAX_SHARED_SECTION_DEPTH - 1,
    });
    render(element);

    expect(await screen.findByText("Get in touch")).toBeInTheDocument();
  });
});

describe("SharedSectionBlockRender — cycle guard", () => {
  it("refuses to render (without fetching) when the key is already in the visited set", async () => {
    const element = await SharedSectionBlockRender({
      data: baseData,
      visitedSharedSectionKeys: new Set(["footer-cta"]),
      sharedSectionDepth: 1,
    });
    render(element);

    expect(screen.getByText(/circular reference detected/i)).toBeInTheDocument();
    expect(mockGetPublishedSharedSectionByKey).not.toHaveBeenCalled();
  });

  it("allows rendering a different key not yet on the visited path", async () => {
    mockGetPublishedSharedSectionByKey.mockResolvedValue({
      key: "footer-cta",
      title: "Footer CTA",
      blocks: [{ id: "b1", type: "section_heading", position: 0, is_visible: true, data: { title: "Get in touch" } }],
    });

    const element = await SharedSectionBlockRender({
      data: baseData,
      visitedSharedSectionKeys: new Set(["some-other-section"]),
      sharedSectionDepth: 0,
    });
    render(element);

    expect(await screen.findByText("Get in touch")).toBeInTheDocument();
  });
});

describe("SharedSectionBlockRender — missing/unpublished section", () => {
  it("renders a diagnostic (not a crash) when no publication exists for the key", async () => {
    mockGetPublishedSharedSectionByKey.mockResolvedValue(null);

    const element = await SharedSectionBlockRender({ data: baseData, sharedSectionDepth: 0 });
    render(element);

    expect(screen.getByText(/not found or not published/i)).toBeInTheDocument();
  });
});
