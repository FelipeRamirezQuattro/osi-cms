import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const subscribe = vi.hoisted(() => vi.fn());
vi.mock("@/lib/actions/subscribe-newsletter", () => ({ subscribeToNewsletter: subscribe }));
vi.mock("next/navigation", () => ({ usePathname: () => "/products/gas-separation" }));

import { newsletterSignupBlock, type NewsletterSignupData } from "@/components/blocks/newsletter-signup";
import { NewsletterSignupRender } from "@/components/blocks/newsletter-signup-client";
import { blockRegistry } from "@/lib/blocks/registry";

afterEach(cleanup);

// The registry stores blocks type-erased, so parse() returns unknown.
const data = newsletterSignupBlock.schema.parse({
  background: "cream",
  spacingTop: "md",
  spacingBottom: "md",
  title: "Stay up to date",
  description: "Get news by email.",
  submitLabel: "Subscribe",
}) as NewsletterSignupData;

describe("newsletter_signup block", () => {
  beforeEach(() => subscribe.mockReset());

  it("is registered and its defaults satisfy its own schema", () => {
    expect(blockRegistry.newsletter_signup).toBeDefined();
    expect(newsletterSignupBlock.schema.safeParse(newsletterSignupBlock.defaults).success).toBe(true);
  });

  it("shows the title, description and a labelled email field", () => {
    render(<NewsletterSignupRender data={data} />);
    expect(screen.getByRole("heading", { name: "Stay up to date" })).toBeInTheDocument();
    expect(screen.getByText("Get news by email.")).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toHaveAttribute("type", "email");
    expect(screen.getByRole("button", { name: "Subscribe" })).toBeInTheDocument();
  });

  it("uses the admin-configured button label", () => {
    render(<NewsletterSignupRender data={{ ...data, submitLabel: "Sign me up" }} />);
    expect(screen.getByRole("button", { name: "Sign me up" })).toBeInTheDocument();
  });

  it("keeps the honeypot out of the accessibility tree and sends the page it was submitted from", async () => {
    subscribe.mockResolvedValue({ status: "success", message: "Almost there." });
    const { container } = render(<NewsletterSignupRender data={data} />);
    const honeypot = container.querySelector("input[name='website']")!;
    expect(honeypot).toHaveAttribute("aria-hidden", "true");
    expect(honeypot).toHaveAttribute("tabindex", "-1");

    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "a@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Subscribe" }));
    await waitFor(() => expect(subscribe).toHaveBeenCalled());
    const submitted = subscribe.mock.calls[0]![1] as FormData;
    expect(submitted.get("email")).toBe("a@example.com");
    expect(submitted.get("pageSlug")).toBe("products/gas-separation");
    expect(submitted.get("website")).toBe("");
  });

  it("replaces the form with the server's confirmation message on success", async () => {
    subscribe.mockResolvedValue({ status: "success", message: "Almost there — check your inbox." });
    render(<NewsletterSignupRender data={data} />);
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "a@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Subscribe" }));
    expect(await screen.findByText("Almost there — check your inbox.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Email address")).not.toBeInTheDocument();
  });

  it("keeps the form and shows the server's error so the visitor can retry", async () => {
    subscribe.mockResolvedValue({ status: "error", message: "Signup is temporarily unavailable. Please try again later." });
    render(<NewsletterSignupRender data={data} />);
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "a@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Subscribe" }));
    expect(await screen.findByText(/temporarily unavailable/)).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
  });
});
