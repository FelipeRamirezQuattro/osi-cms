import { describe, expect, it } from "vitest";
import { findRedirectChainIssue, type RedirectEdge } from "@/lib/validation/redirects";

describe("findRedirectChainIssue (flat table: no chains, no loops)", () => {
  it("rejects a one-step self-loop", () => {
    expect(findRedirectChainIssue({ from_path: "/old", to_path: "/old" }, [])).toMatch(/can't point to itself/i);
    expect(findRedirectChainIssue({ from_path: "/Old/", to_path: "/old" }, [])).toMatch(/can't point to itself/i);
  });

  it("allows a simple, non-conflicting redirect", () => {
    const existing: RedirectEdge[] = [{ id: "1", from_path: "/a", to_path: "/b" }];
    expect(findRedirectChainIssue({ from_path: "/x", to_path: "/y" }, existing)).toBeNull();
  });

  it("allows two redirects to the same destination", () => {
    const existing: RedirectEdge[] = [{ id: "1", from_path: "/a", to_path: "/b" }];
    expect(findRedirectChainIssue({ from_path: "/c", to_path: "/b" }, existing)).toBeNull();
  });

  it("refuses A -> B when B -> C exists, naming the conflicting row and the fix", () => {
    const existing: RedirectEdge[] = [{ id: "1", from_path: "/b", to_path: "/c" }];
    expect(findRedirectChainIssue({ from_path: "/a", to_path: "/b" }, existing)).toBe(
      "/b already redirects to /c — point this one straight to /c.",
    );
  });

  it("refuses X -> A already existing when adding A -> B, naming that row", () => {
    const existing: RedirectEdge[] = [{ id: "1", from_path: "/x", to_path: "/a" }];
    const issue = findRedirectChainIssue({ from_path: "/a", to_path: "/b" }, existing);
    expect(issue).toMatch(/^\/x already redirects to \/a — point that redirect straight to \/b first/);
  });

  it("detects a two-way loop (A -> B, existing B -> A)", () => {
    const existing: RedirectEdge[] = [{ id: "1", from_path: "/b", to_path: "/a" }];
    expect(findRedirectChainIssue({ from_path: "/a", to_path: "/b" }, existing)).toBe(
      "/b already redirects back to /a — this would create a loop.",
    );
  });

  it("compares paths ignoring case and a trailing slash", () => {
    const existing: RedirectEdge[] = [{ id: "1", from_path: "/B/", to_path: "/c" }];
    expect(findRedirectChainIssue({ from_path: "/a", to_path: "/b" }, existing)).toMatch(/already redirects to \/c/);
  });

  it("excludes the row being edited from the existing set (no false conflict on a no-op edit)", () => {
    const existing: RedirectEdge[] = [{ id: "1", from_path: "/a", to_path: "/b" }];
    expect(findRedirectChainIssue({ id: "1", from_path: "/a", to_path: "/b" }, existing)).toBeNull();
    // ...and re-pointing the same row elsewhere is judged against the *other* rows only.
    expect(findRedirectChainIssue({ id: "1", from_path: "/a", to_path: "/z" }, existing)).toBeNull();
  });
});
