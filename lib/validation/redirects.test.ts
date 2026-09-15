import { describe, expect, it } from "vitest";
import { findRedirectChainIssue, MAX_REDIRECT_CHAIN_HOPS, type RedirectEdge } from "@/lib/validation/redirects";

describe("findRedirectChainIssue", () => {
  it("rejects a one-step self-loop", () => {
    const issue = findRedirectChainIssue({ from_path: "/old", to_path: "/old" }, []);
    expect(issue).toMatch(/can't point to itself/i);
  });

  it("allows a simple, non-conflicting redirect", () => {
    const existing: RedirectEdge[] = [{ id: "1", from_path: "/a", to_path: "/b" }];
    expect(findRedirectChainIssue({ from_path: "/x", to_path: "/y" }, existing)).toBeNull();
  });

  it("allows a redirect that chains into one existing hop (2 hops total)", () => {
    const existing: RedirectEdge[] = [{ id: "1", from_path: "/b", to_path: "/c" }];
    // /a -> /b -> /c : 2 hops, within the default limit of 3.
    expect(findRedirectChainIssue({ from_path: "/a", to_path: "/b" }, existing)).toBeNull();
  });

  it("rejects a chain longer than the configured limit", () => {
    const existing: RedirectEdge[] = [
      { id: "1", from_path: "/b", to_path: "/c" },
      { id: "2", from_path: "/c", to_path: "/d" },
      { id: "3", from_path: "/d", to_path: "/e" },
    ];
    // Candidate /a -> /b, combined with existing b->c->d->e, is 4 hops total.
    const issue = findRedirectChainIssue({ from_path: "/a", to_path: "/b" }, existing);
    expect(issue).toMatch(/chain more than 3 hops/i);
  });

  it("respects a custom maxHops", () => {
    const existing: RedirectEdge[] = [{ id: "1", from_path: "/b", to_path: "/c" }];
    // /a -> /b -> /c is 2 hops; with maxHops=1 that's already too long.
    const issue = findRedirectChainIssue({ from_path: "/a", to_path: "/b" }, existing, 1);
    expect(issue).toMatch(/chain more than 1 hop/i);
  });

  it("detects a multi-hop loop (A -> B, existing B -> A)", () => {
    const existing: RedirectEdge[] = [{ id: "1", from_path: "/b", to_path: "/a" }];
    const issue = findRedirectChainIssue({ from_path: "/a", to_path: "/b" }, existing);
    expect(issue).toMatch(/loop/i);
  });

  it("detects a longer loop (A -> B, existing B -> C -> A)", () => {
    const existing: RedirectEdge[] = [
      { id: "1", from_path: "/b", to_path: "/c" },
      { id: "2", from_path: "/c", to_path: "/a" },
    ];
    const issue = findRedirectChainIssue({ from_path: "/a", to_path: "/b" }, existing, 5);
    expect(issue).toMatch(/loop/i);
  });

  it("excludes the row being edited from the existing set (no false self-loop on a no-op edit)", () => {
    const existing: RedirectEdge[] = [{ id: "1", from_path: "/a", to_path: "/b" }];
    // Editing redirect id "1" to point .../a -> /b again (unchanged) must
    // not be flagged as looping against its own prior value.
    expect(findRedirectChainIssue({ id: "1", from_path: "/a", to_path: "/b" }, existing)).toBeNull();
  });

  it("uses 3 as the documented default limit", () => {
    expect(MAX_REDIRECT_CHAIN_HOPS).toBe(3);
  });
});
