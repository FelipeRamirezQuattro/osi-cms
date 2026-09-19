export type BotCategory = "search_bot" | "ai_bot" | "other_bot";
export type BotMatch = { name: string; category: BotCategory };

// Order matters: specific patterns before the generic catch-all, so e.g.
// "GPTBot" (which also contains "bot") is never misclassified as
// other_bot by a naive /bot/i test running first.
const SEARCH_BOT_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: "Googlebot", pattern: /googlebot/i },
  { name: "bingbot", pattern: /bingbot/i },
  { name: "Slurp", pattern: /slurp/i },
  { name: "DuckDuckBot", pattern: /duckduckbot/i },
  { name: "Baiduspider", pattern: /baiduspider/i },
  { name: "YandexBot", pattern: /yandexbot/i },
  { name: "Applebot", pattern: /applebot(?!-extended)/i },
];

const AI_BOT_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: "GPTBot", pattern: /gptbot/i },
  { name: "ChatGPT-User", pattern: /chatgpt-user/i },
  { name: "OAI-SearchBot", pattern: /oai-searchbot/i },
  { name: "PerplexityBot", pattern: /perplexitybot/i },
  { name: "Perplexity-User", pattern: /perplexity-user/i },
  { name: "ClaudeBot", pattern: /claudebot/i },
  { name: "Claude-User", pattern: /claude-user/i },
  { name: "Claude-SearchBot", pattern: /claude-searchbot/i },
  { name: "anthropic-ai", pattern: /anthropic-ai/i },
  { name: "Google-Extended", pattern: /google-extended/i },
  { name: "Applebot-Extended", pattern: /applebot-extended/i },
  { name: "Bytespider", pattern: /bytespider/i },
  { name: "CCBot", pattern: /ccbot/i },
  { name: "Amazonbot", pattern: /amazonbot/i },
  { name: "Meta-ExternalAgent", pattern: /meta-externalagent/i },
  { name: "cohere-ai", pattern: /cohere-ai/i },
  { name: "Diffbot", pattern: /diffbot/i },
];

const GENERIC_BOT_PATTERN = /bot|crawler|spider/i;

export function detectBot(userAgent: string | null | undefined): BotMatch | null {
  if (!userAgent) return null;

  for (const { name, pattern } of AI_BOT_PATTERNS) {
    if (pattern.test(userAgent)) return { name, category: "ai_bot" };
  }

  for (const { name, pattern } of SEARCH_BOT_PATTERNS) {
    if (pattern.test(userAgent)) return { name, category: "search_bot" };
  }

  if (GENERIC_BOT_PATTERN.test(userAgent)) {
    const name = userAgent.split(/\s/)[0] || userAgent;
    return { name, category: "other_bot" };
  }

  return null;
}
