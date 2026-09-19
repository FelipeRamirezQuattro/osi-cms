import { createServerClient } from "@supabase/ssr";
import { detectBot } from "@/lib/analytics/bot-detection";

/**
 * Called from proxy.ts for every non-asset GET/HEAD request to a public
 * page. Constructs its own throwaway anon client with a no-op cookie
 * adapter, deliberately bypassing lib/data (constraint 2) — the same
 * technical necessity already documented on
 * lib/auth/index.ts's publicSlugIsResolvable() applies here: proxy.ts
 * runs in a context that can't use next/headers' cookies(), and this
 * write doesn't need a real visitor session anyway (a bot has none).
 * Fire-and-forget and fully best-effort: a bot-visit log write must
 * never affect the response a crawler receives.
 */
export function logBotVisitIfMatched(path: string, userAgent: string | null): void {
  const match = detectBot(userAgent);
  if (!match) return;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );

  void supabase
    .from("analytics_bot_visits")
    .insert({ path, user_agent: userAgent, bot_name: match.name, bot_category: match.category })
    .then(({ error }) => {
      if (error) console.error("[bot-detection] Failed to record bot visit:", error.message);
    });
}
