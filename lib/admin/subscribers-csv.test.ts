import { describe, expect, it } from "vitest";
import { buildSubscribersCsv } from "@/lib/admin/subscribers-csv";
import type { NewsletterSubscriberWithTags, NewsletterTag } from "@/lib/data/newsletter-subscribers";

const tags: NewsletterTag[] = [
  { id: "t1", name: "Distributors", created_at: "2026-09-01T00:00:00Z" },
  { id: "t2", name: "Gas, lift", created_at: "2026-09-01T00:00:00Z" },
];

function subscriber(overrides: Partial<NewsletterSubscriberWithTags> = {}): NewsletterSubscriberWithTags {
  return {
    id: "s1",
    email: "a@example.com",
    status: "subscribed",
    source: "signup_form",
    page_slug: "home",
    ip_hash: "hash",
    consented_at: "2026-09-02T00:00:00Z",
    confirmation_sent_at: "2026-09-02T00:00:01Z",
    confirmed_at: "2026-09-02T00:05:00Z",
    unsubscribed_at: null,
    created_at: "2026-09-02T00:00:00Z",
    updated_at: "2026-09-02T00:05:00Z",
    tag_ids: [],
    ...overrides,
  };
}

describe("buildSubscribersCsv", () => {
  it("writes a header and one CRLF-terminated line per subscriber", () => {
    const csv = buildSubscribersCsv([subscriber()], tags);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("email,status,tags,source,page_slug,consented_at,confirmed_at,unsubscribed_at,created_at");
    expect(lines[1]).toBe("a@example.com,subscribed,,signup_form,home,2026-09-02T00:00:00Z,2026-09-02T00:05:00Z,,2026-09-02T00:00:00Z");
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("joins tag names and quotes a cell containing a comma", () => {
    const csv = buildSubscribersCsv([subscriber({ tag_ids: ["t1", "t2"] })], tags);
    expect(csv).toContain('"Distributors; Gas, lift"');
  });

  it("neutralizes formula injection in the email column", () => {
    const csv = buildSubscribersCsv([subscriber({ email: "=HYPERLINK(1)@x.com" })], tags);
    expect(csv.split("\r\n")[1]?.startsWith("'=HYPERLINK(1)@x.com,")).toBe(true);
  });

  it("ignores tag ids that no longer exist", () => {
    const csv = buildSubscribersCsv([subscriber({ tag_ids: ["gone"] })], tags);
    expect(csv.split("\r\n")[1]).toContain("subscribed,,signup_form");
  });
});
