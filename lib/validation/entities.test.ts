import { describe, expect, it } from "vitest";
import { validateEntityInput } from "@/lib/validation/entities";

describe("validateEntityInput — industries/applications", () => {
  it("accepts a valid industry and rejects a blank name/slug", () => {
    expect(validateEntityInput("industries", { name: "Oil & Gas", slug: "oil-gas", status: "draft" }).success).toBe(true);
    expect(validateEntityInput("industries", { name: "", slug: "oil-gas", status: "draft" }).success).toBe(false);
    expect(validateEntityInput("applications", { name: "Lift", slug: "", status: "draft" }).success).toBe(false);
  });

  // Task 15 scope check: industries/applications are deliberately NOT
  // archive-scoped (only pages/products/news_posts/resources are).
  it("does not accept 'archived' as a status", () => {
    expect(validateEntityInput("industries", { name: "Oil & Gas", slug: "oil-gas", status: "archived" }).success).toBe(
      false,
    );
  });
});

describe("validateEntityInput — news", () => {
  function baseNews(overrides: Record<string, unknown> = {}) {
    return {
      title: "New product launch",
      slug: "new-product-launch",
      kind: "news",
      is_featured: false,
      status: "draft",
      ...overrides,
    };
  }

  it("accepts a plain news post with no event_date", () => {
    expect(validateEntityInput("news", baseNews()).success).toBe(true);
  });

  it("requires event_date before publishing an event or conference post", () => {
    const result = validateEntityInput("news", baseNews({ kind: "event", status: "published", event_date: null }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(["event_date"]);

    const conference = validateEntityInput("news", baseNews({ kind: "conference", status: "published", event_date: null }));
    expect(conference.success).toBe(false);
  });

  it("allows an event post to stay a draft with no event_date", () => {
    expect(validateEntityInput("news", baseNews({ kind: "event", status: "draft" })).success).toBe(true);
  });

  it("allows publishing an event post once event_date is set", () => {
    expect(
      validateEntityInput("news", baseNews({ kind: "event", status: "published", event_date: "2026-05-01" })).success,
    ).toBe(true);
  });

  it("publishes a blog post without an event_date", () => {
    expect(validateEntityInput("news", baseNews({ kind: "blog", status: "published" })).success).toBe(true);
  });

  it("accepts blog author, tags and reading time, defaulting tags to empty", () => {
    const parsed = validateEntityInput(
      "news",
      baseNews({ kind: "blog", author_name: "Jane Doe", tags: ["esp", " gas "], reading_minutes: 4 }),
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toMatchObject({ tags: ["esp", "gas"], reading_minutes: 4 });

    const bare = validateEntityInput("news", baseNews({ kind: "blog" }));
    expect(bare.success && bare.data).toMatchObject({ tags: [], reading_minutes: null, author_name: null });
  });

  it("rejects blank tags, more than 10 tags, and a non-positive reading time", () => {
    expect(validateEntityInput("news", baseNews({ tags: ["ok", "  "] })).success).toBe(false);
    expect(validateEntityInput("news", baseNews({ tags: Array.from({ length: 11 }, (_, i) => `t${i}`) })).success).toBe(false);
    expect(validateEntityInput("news", baseNews({ reading_minutes: 0 })).success).toBe(false);
  });

  it("rejects an unsafe cta_url and accepts a real one", () => {
    expect(validateEntityInput("news", baseNews({ cta_url: "javascript:alert(1)" })).success).toBe(false);
    expect(validateEntityInput("news", baseNews({ cta_url: "/contact" })).success).toBe(true);
  });

  it("rejects an unparsable event_date", () => {
    expect(validateEntityInput("news", baseNews({ event_date: "not-a-date" })).success).toBe(false);
  });

  // Task 15: news is one of the 4 archive-scoped tables.
  it("accepts 'archived' as a status", () => {
    expect(validateEntityInput("news", baseNews({ status: "archived" })).success).toBe(true);
  });

  it("rejects a status outside draft/published/archived", () => {
    expect(validateEntityInput("news", baseNews({ status: "deleted" })).success).toBe(false);
  });
});

describe("validateEntityInput — resources", () => {
  it("requires a safe, non-blank file_url", () => {
    const valid = validateEntityInput("resources", {
      title: "Datasheet",
      kind: "datasheet",
      file_url: "https://osi.example/datasheet.pdf",
      status: "draft",
    });
    expect(valid.success).toBe(true);

    const unsafe = validateEntityInput("resources", {
      title: "Datasheet",
      kind: "datasheet",
      file_url: "javascript:alert(1)",
      status: "draft",
    });
    expect(unsafe.success).toBe(false);
  });

  // Task 15: resources is one of the 4 archive-scoped tables.
  it("accepts 'archived' as a status", () => {
    const result = validateEntityInput("resources", {
      title: "Datasheet",
      kind: "datasheet",
      file_url: "https://osi.example/datasheet.pdf",
      status: "archived",
    });
    expect(result.success).toBe(true);
  });
});

describe("validateEntityInput — locations", () => {
  it("validates lat/lng bounds and a well-formed email", () => {
    const base = { name: "Houston HQ", kind: "hq", country: "USA", status: "draft" };
    expect(validateEntityInput("locations", { ...base, lat: 29.7, lng: -95.3 }).success).toBe(true);
    expect(validateEntityInput("locations", { ...base, lat: 200 }).success).toBe(false);
    expect(validateEntityInput("locations", { ...base, email: "not-an-email" }).success).toBe(false);
  });
});

describe("validateEntityInput — redirects", () => {
  it("requires from_path to start with '/' and to_path to be a safe href", () => {
    expect(validateEntityInput("redirects", { from_path: "old-page", to_path: "/new-page", status_code: 301 }).success).toBe(
      false,
    );
    expect(validateEntityInput("redirects", { from_path: "/old-page", to_path: "javascript:alert(1)", status_code: 301 }).success).toBe(
      false,
    );
    expect(validateEntityInput("redirects", { from_path: "/old-page", to_path: "/new-page", status_code: 301 }).success).toBe(
      true,
    );
  });

  it("only accepts the four real redirect status codes", () => {
    expect(validateEntityInput("redirects", { from_path: "/a", to_path: "/b", status_code: 418 }).success).toBe(false);
  });

  // Task 15: the one-step self-loop case this schema alone can catch —
  // multi-hop chain/loop rejection needs the other existing redirect
  // rows, which is lib/validation/redirects.ts's findRedirectChainIssue
  // (see its own test file), called separately in
  // lib/actions/entities.ts's saveEntityAction.
  it("rejects a redirect whose from_path and to_path are the same", () => {
    const result = validateEntityInput("redirects", { from_path: "/a", to_path: "/a", status_code: 301 });
    expect(result.success).toBe(false);
  });
});
