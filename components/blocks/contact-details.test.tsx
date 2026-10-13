import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { contactDetailsBlock } from "@/components/blocks/contact-details";

afterEach(cleanup);

const { mockGetSiteSettings } = vi.hoisted(() => ({ mockGetSiteSettings: vi.fn() }));
vi.mock("@/lib/data/settings", () => ({ getSiteSettings: mockGetSiteSettings }));

const baseSettings = {
  phone: "+1 432 555 0100",
  email: "info@example.com",
  address_lines: ["1 Main St", "Odessa, TX"],
  map_embed_url: null,
  social_facebook: null,
  social_linkedin: "https://www.linkedin.com/company/osi",
  social_youtube: null,
  social_instagram: null,
};

async function renderBlock(data: Record<string, unknown>, opts: { isPreview?: boolean; settings?: object } = {}) {
  mockGetSiteSettings.mockResolvedValue({ ...baseSettings, ...(opts.settings ?? {}) });
  const defaults = contactDetailsBlock.defaults as Record<string, unknown>;
  const element = await contactDetailsBlock.Render({ data: { ...defaults, ...data } as never, isPreview: opts.isPreview });
  render(element!);
}

describe("contact_details block (BLQ-06)", () => {
  it("frames a Google Maps link, converting a plain maps URL to its embeddable form", async () => {
    await renderBlock({ mapEmbedUrl: "https://www.google.com/maps/place/Odessa,+TX" });
    const frame = screen.getByTitle("Map");
    expect(frame.getAttribute("src")).toContain("output=embed");
  });

  it("never frames an unrecognized link — it shows it as an 'Open map' link instead", async () => {
    await renderBlock({ mapEmbedUrl: "https://maps.app.goo.gl/abc123" });
    expect(screen.queryByTitle("Map")).toBeNull();
    expect(screen.getByRole("link", { name: /Open map/ })).toHaveAttribute("href", "https://maps.app.goo.gl/abc123");
  });

  it("renders every field the admin offers: the social toggle controls the social links", async () => {
    await renderBlock({ showSocial: true });
    expect(screen.getByRole("link", { name: "LinkedIn" })).toBeInTheDocument();
    cleanup();
    await renderBlock({ showSocial: false });
    expect(screen.queryByRole("link", { name: "LinkedIn" })).toBeNull();
  });

  it("in preview, says where the details come from when Settings is empty", async () => {
    const empty = { phone: null, email: null, address_lines: null, social_linkedin: null };
    await renderBlock({}, { isPreview: true, settings: empty });
    expect(screen.getByRole("note")).toHaveTextContent("Admin → Settings");
    cleanup();
    await renderBlock({}, { isPreview: false, settings: empty });
    expect(screen.queryByRole("note")).toBeNull();
  });
});
