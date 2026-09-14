import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { newsFeedBlock } from "@/components/blocks/news-feed";
import { newsHref } from "@/lib/routes";
import type { Tables } from "@/lib/db/database.types";

/**
 * Covers the plan's broken-link bullet for news: "news ... links must
 * resolve or not render as links". news-feed.tsx's Render is an async
 * Server Component that calls lib/data/news's listNewsPosts and builds
 * every link (the featured post and each PostCard) via lib/routes.ts's
 * newsHref — this mocks that data call with fixture posts and asserts
 * every rendered <a href> matches newsHref(slug) for that post.
 *
 * Render is called directly (it's exported as newsFeedBlock.Render, the
 * same function BlockRenderer invokes) and its resolved element is fed to
 * react-dom/server's renderToStaticMarkup rather than
 * @testing-library/react's render(): this avoids needing a live
 * IntersectionObserver-driven scroll-reveal cycle (AnimatedGroup/
 * AnimatedItem) to actually settle before asserting, since a static
 * server render never runs effects in the first place — the hrefs are
 * present in the initial markup regardless of motion state.
 */

const { mockListNewsPosts } = vi.hoisted(() => ({ mockListNewsPosts: vi.fn() }));
vi.mock("@/lib/data/news", () => ({
  listNewsPosts: mockListNewsPosts,
}));

function post(overrides: Partial<Tables<"news_posts">>): Tables<"news_posts"> {
  return {
    id: overrides.slug ?? "id",
    slug: "post",
    title: "Post",
    kind: "news",
    cover_image_url: null,
    published_at: "2026-01-01T00:00:00Z",
    locale: "en",
    status: "published",
    ...overrides,
  } as unknown as Tables<"news_posts">;
}

async function renderNewsFeed(data: Partial<Parameters<typeof newsFeedBlock.Render>[0]["data"]> = {}) {
  const defaults = newsFeedBlock.defaults as Record<string, unknown>;
  const element = await newsFeedBlock.Render({ data: { ...defaults, ...data } as never });
  return element ? renderToStaticMarkup(element) : "";
}

describe("news_feed block generates routes via lib/routes.ts's newsHref", () => {
  it("the featured post's link is newsHref(slug)", async () => {
    mockListNewsPosts.mockResolvedValue([post({ slug: "gas-conference-2026", title: "Gas Conference 2026" })]);

    const html = await renderNewsFeed();
    const container = document.createElement("div");
    container.innerHTML = html;
    const hrefs = [...container.querySelectorAll("a")].map((a) => a.getAttribute("href"));

    expect(hrefs).toContain(newsHref("gas-conference-2026"));
  });

  it("every non-featured post's card link is also newsHref(slug)", async () => {
    mockListNewsPosts.mockResolvedValue([
      post({ slug: "featured-post", title: "Featured" }),
      post({ slug: "second-post", title: "Second" }),
      post({ slug: "third-post", title: "Third" }),
    ]);

    const html = await renderNewsFeed();
    const container = document.createElement("div");
    container.innerHTML = html;
    const hrefs = [...container.querySelectorAll("a")].map((a) => a.getAttribute("href"));

    expect(hrefs).toEqual(
      expect.arrayContaining([newsHref("featured-post"), newsHref("second-post"), newsHref("third-post")]),
    );
  });

  it("renders nothing (no dead links) when there are no published posts", async () => {
    mockListNewsPosts.mockResolvedValue([]);
    expect(await renderNewsFeed()).toBe("");
  });
});
