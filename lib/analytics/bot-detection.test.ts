import { describe, expect, it } from "vitest";
import { detectBot } from "@/lib/analytics/bot-detection";

describe("detectBot", () => {
  it("returns null for an ordinary browser user-agent", () => {
    expect(
      detectBot(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      ),
    ).toBeNull();
  });

  it("detects Googlebot as a search_bot", () => {
    expect(detectBot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toEqual({
      name: "Googlebot",
      category: "search_bot",
    });
  });

  it("detects bingbot as a search_bot", () => {
    expect(detectBot("Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)")).toEqual({
      name: "bingbot",
      category: "search_bot",
    });
  });

  it("detects GPTBot as an ai_bot", () => {
    expect(detectBot("Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot")).toEqual({
      name: "GPTBot",
      category: "ai_bot",
    });
  });

  it("detects PerplexityBot as an ai_bot", () => {
    expect(detectBot("Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/bot)")).toEqual({
      name: "PerplexityBot",
      category: "ai_bot",
    });
  });

  it("detects ClaudeBot as an ai_bot", () => {
    expect(detectBot("Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)")).toEqual({
      name: "ClaudeBot",
      category: "ai_bot",
    });
  });

  it("falls back to a generic other_bot category for an unrecognized crawler", () => {
    expect(detectBot("SomeRandomCrawler/1.0 (+http://example.com/crawler)")).toEqual({
      name: "SomeRandomCrawler/1.0",
      category: "other_bot",
    });
  });

  it("returns null for an empty or missing user-agent", () => {
    expect(detectBot("")).toBeNull();
    expect(detectBot(null)).toBeNull();
  });

  it("prioritizes a specific AI-bot match over the generic bot pattern", () => {
    // "bot" appears in "GPTBot" - the generic catch-all must not fire first
    // and mislabel this as other_bot.
    expect(detectBot("GPTBot")?.category).toBe("ai_bot");
  });
});
