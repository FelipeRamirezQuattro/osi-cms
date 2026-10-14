import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { RecoveryLinkRedirect } from "@/components/auth/recovery-link-redirect";

const replace = vi.fn();
beforeEach(() => {
  replace.mockReset();
  Object.defineProperty(window, "location", { value: { hash: "", replace }, writable: true });
});
afterEach(cleanup);

function visit(hash: string) {
  window.location.hash = hash;
  render(<RecoveryLinkRedirect />);
}

describe("RecoveryLinkRedirect (auth emails that land on the public site)", () => {
  it("forwards a recovery session in the fragment to the reset page, keeping the fragment", () => {
    visit("#access_token=a&refresh_token=r&type=recovery");
    expect(replace).toHaveBeenCalledWith("/admin/reset-password#access_token=a&refresh_token=r&type=recovery");
  });
  it("forwards an invite session too", () => {
    visit("#access_token=a&refresh_token=r&type=invite");
    expect(replace).toHaveBeenCalledWith(expect.stringContaining("/admin/reset-password#access_token=a"));
  });
  it("sends a dead link to 'request a new one'", () => {
    visit("#error=access_denied&error_code=otp_expired&error_description=x");
    expect(replace).toHaveBeenCalledWith("/admin/forgot-password?expired=1");
  });
  it("does nothing on an ordinary page load", () => {
    visit("");
    visit("#contact");
    expect(replace).not.toHaveBeenCalled();
  });
});
