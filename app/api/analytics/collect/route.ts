import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { classifyTraffic } from "@/lib/analytics/classify-traffic";
import { ATTRIBUTION_COOKIE, SESSION_COOKIE, VISITOR_COOKIE } from "@/lib/analytics/cookies";
import { hashClientIp } from "@/lib/actions/form-submission-pipeline";
import {
  countRecentAnalyticsWritesByIp,
  recordAnalyticsEvent,
  recordPageview,
} from "@/lib/data/analytics-events";
import type { Json } from "@/lib/db/database.types";

// Sole beacon endpoint for real-visitor tracking (bots that don't run JS
// never reach this route — see lib/analytics/bot-detection.ts + proxy.ts
// for that separate path). Not a Server Action: sent via
// navigator.sendBeacon, which can only POST to a URL, not invoke a
// function reference.

const VISITOR_MAX_AGE_SECONDS = 60 * 60 * 24 * 400; // ~400 days
const SESSION_MAX_AGE_SECONDS = 60 * 30; // 30 minutes, sliding

const RATE_LIMIT_MAX = 300;
const RATE_LIMIT_WINDOW_MINUTES = 10;

const payloadSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("pageview"),
    path: z.string().min(1),
    referrer: z.string().nullable().optional(),
    utmSource: z.string().nullable().optional(),
    utmMedium: z.string().nullable().optional(),
    utmCampaign: z.string().nullable().optional(),
  }),
  z.object({
    type: z.literal("event"),
    eventType: z.enum(["button_click", "contact_click"]),
    eventLabel: z.string().min(1),
    path: z.string().min(1),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
]);

type Attribution = {
  referrerHost: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  trafficCategory: ReturnType<typeof classifyTraffic>;
};

function parseReferrerHost(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname || null;
  } catch {
    return null;
  }
}

function baseCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    return new NextResponse(null, { status: 204 });
  }
  const body = parsed.data;

  const ipHash = await hashClientIp();
  const recentCount = await countRecentAnalyticsWritesByIp(ipHash, RATE_LIMIT_WINDOW_MINUTES);
  if (recentCount >= RATE_LIMIT_MAX) {
    return new NextResponse(null, { status: 204 });
  }

  const cookieStore = await cookies();
  const h = await headers();

  const existingVisitorId = cookieStore.get(VISITOR_COOKIE)?.value ?? null;
  const isNewVisitor = existingVisitorId === null;
  const visitorId = existingVisitorId ?? randomUUID();

  const existingSessionId = cookieStore.get(SESSION_COOKIE)?.value ?? null;
  const sessionId = existingSessionId ?? randomUUID();

  let attribution: Attribution;
  const existingAttrRaw = cookieStore.get(ATTRIBUTION_COOKIE)?.value ?? null;
  if (existingSessionId && existingAttrRaw) {
    // Mid-session: preserve the entry attribution. A subsequent internal
    // navigation's document.referrer is the previous page on this same
    // site, not how the visitor originally arrived — it must never
    // overwrite the session's real acquisition source.
    try {
      attribution = JSON.parse(existingAttrRaw) as Attribution;
    } catch {
      attribution = { referrerHost: null, utmSource: null, utmMedium: null, utmCampaign: null, trafficCategory: "direct" };
    }
  } else {
    const referrerHost = body.type === "pageview" ? parseReferrerHost(body.referrer) : null;
    const utmSource = body.type === "pageview" ? body.utmSource ?? null : null;
    const utmMedium = body.type === "pageview" ? body.utmMedium ?? null : null;
    const utmCampaign = body.type === "pageview" ? body.utmCampaign ?? null : null;
    attribution = {
      referrerHost,
      utmSource,
      utmMedium,
      utmCampaign,
      trafficCategory: classifyTraffic({ referrerHost, utmMedium }),
    };
  }

  const country = h.get("x-vercel-ip-country");
  const userAgent = h.get("user-agent");

  if (body.type === "pageview") {
    await recordPageview({
      session_id: sessionId,
      visitor_id: visitorId,
      is_new_visitor: isNewVisitor,
      path: body.path,
      referrer_host: attribution.referrerHost,
      traffic_category: attribution.trafficCategory,
      utm_source: attribution.utmSource,
      utm_medium: attribution.utmMedium,
      utm_campaign: attribution.utmCampaign,
      country,
      ip_hash: ipHash,
      user_agent: userAgent,
    });
  } else {
    await recordAnalyticsEvent({
      session_id: sessionId,
      visitor_id: visitorId,
      event_type: body.eventType,
      event_label: body.eventLabel,
      path: body.path,
      metadata: (body.metadata as unknown as Json) ?? null,
      ip_hash: ipHash,
    });
  }

  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(VISITOR_COOKIE, visitorId, baseCookieOptions(VISITOR_MAX_AGE_SECONDS));
  response.cookies.set(SESSION_COOKIE, sessionId, baseCookieOptions(SESSION_MAX_AGE_SECONDS));
  response.cookies.set(ATTRIBUTION_COOKIE, JSON.stringify(attribution), baseCookieOptions(SESSION_MAX_AGE_SECONDS));
  return response;
}
