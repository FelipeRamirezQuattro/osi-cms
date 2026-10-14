import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockSetSession, mockGetSession, mockExchange } = vi.hoisted(() => ({ mockSetSession: vi.fn(), mockGetSession: vi.fn(), mockExchange: vi.fn() }));
vi.mock("@/lib/auth/client", () => ({
  getBrowserAuth: () => ({ setSession: mockSetSession, getSession: mockGetSession, exchangeCodeForSession: mockExchange, updateUser: vi.fn() }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import { ResetPasswordForm } from "./reset-password-form";

beforeEach(() => {
  mockSetSession.mockReset();
  mockGetSession.mockReset();
  mockExchange.mockReset();
});
afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

describe("ResetPasswordForm sources of a recovery session", () => {
  it("legacy hash-fragment link still works (fallback while email templates are unchanged)", async () => {
    window.history.replaceState(null, "", "/admin/reset-password#access_token=a&refresh_token=r&type=recovery");
    mockSetSession.mockResolvedValue({ error: null });
    render(<ResetPasswordForm />);
    await waitFor(() => expect(screen.getByRole("button", { name: /set password/i })).toBeTruthy());
    expect(mockSetSession).toHaveBeenCalledWith({ access_token: "a", refresh_token: "r" });
    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it("token-hash flow: no hash, but the server already set a session cookie", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "x" } } });
    render(<ResetPasswordForm />);
    await waitFor(() => expect(screen.getByRole("button", { name: /set password/i })).toBeTruthy());
  });

  it("no hash and no session shows the expired message", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    render(<ResetPasswordForm />);
    await waitFor(() => expect(screen.getByText(/invalid or has expired/i)).toBeTruthy());
  });

  it("an error in the hash shows the expired message", async () => {
    window.history.replaceState(null, "", "/admin/reset-password#error=access_denied&error_code=otp_expired");
    render(<ResetPasswordForm />);
    await waitFor(() => expect(screen.getByText(/invalid or has expired/i)).toBeTruthy());
  });

  it("a PKCE link (?code=) is exchanged for a session and then shows the form", async () => {
    window.history.replaceState(null, "", "/admin/reset-password?code=abc-123");
    mockExchange.mockResolvedValue({ error: null });
    render(<ResetPasswordForm />);
    await waitFor(() => expect(screen.getByRole("button", { name: /set password/i })).toBeTruthy());
    expect(mockExchange).toHaveBeenCalledWith("abc-123");
  });

  it("a PKCE code that can't be exchanged (other browser / used) shows the expired message", async () => {
    window.history.replaceState(null, "", "/admin/reset-password?code=abc-123");
    mockExchange.mockResolvedValue({ error: { message: "PKCE code verifier not found in storage" } });
    render(<ResetPasswordForm />);
    await waitFor(() => expect(screen.getByText(/invalid or has expired/i)).toBeTruthy());
  });
});
