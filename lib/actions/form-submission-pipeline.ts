import { cookies, headers } from "next/headers";
import { createHash } from "node:crypto";
import { countRecentSubmissionsByIp, insertFormSubmission } from "@/lib/data/forms";
import { SESSION_COOKIE, VISITOR_COOKIE } from "@/lib/analytics/cookies";
import type { Json } from "@/lib/db/database.types";

/**
 * Shared honeypot/rate-limit/insert/notify pipeline behind every public
 * form submission — originally inline in submit-contact-form.ts, pulled
 * out here (Task 10) so the generic form engine's submitFormAction
 * (lib/actions/submit-form.ts) doesn't duplicate it. Deliberately NOT a
 * "use server" module: it's an internal helper imported by two "use
 * server" action files, not a Server Action itself, and a "use server"
 * file may only export async functions — `hashClientIp` alone would be
 * fine, but keeping the whole module plain avoids that constraint
 * entirely and makes clear this isn't meant to be called directly from a
 * client component.
 */

// Not persisted anywhere, not exposed to the client — just enough to
// rate-limit by IP without storing a raw IP address in the DB.
export async function hashClientIp(): Promise<string> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return createHash("sha256")
    .update(`${ip}:${process.env.IP_HASH_SALT ?? ""}`)
    .digest("hex");
}

export const RATE_LIMIT_MAX = 3;
export const RATE_LIMIT_WINDOW_MINUTES = 10;

export type FormSubmissionResult = { status: "idle" | "success" | "error"; message?: string };

export async function processFormSubmission(params: {
  formKey: string;
  pageSlug?: string | null;
  payload: Record<string, unknown>;
  /** Honeypot field was filled in — pretend success, drop the submission silently. */
  honeypotTripped: boolean;
  /** Best-effort notification (e.g. sendContactNotification/sendFormNotification) — never allowed to throw past this. */
  notify: () => Promise<void>;
}): Promise<FormSubmissionResult> {
  if (params.honeypotTripped) {
    return { status: "success" };
  }

  const ipHash = await hashClientIp();
  const recentCount = await countRecentSubmissionsByIp(ipHash, RATE_LIMIT_WINDOW_MINUTES);
  if (recentCount >= RATE_LIMIT_MAX) {
    return { status: "error", message: "Too many submissions — please try again in a few minutes." };
  }

  const h = await headers();
  const cookieStore = await cookies();
  const { error } = await insertFormSubmission({
    form_key: params.formKey,
    page_slug: params.pageSlug ?? undefined,
    // A concrete Zod-parsed object shape happens to satisfy Json
    // structurally (see submit-contact-form.ts's original inline call);
    // the generic `Record<string, unknown>` this function takes doesn't,
    // since `unknown` isn't assignable into Json's value positions —
    // hence the explicit cast, still whatever plain JSON-serializable
    // object the caller built.
    payload: params.payload as unknown as Json,
    ip_hash: ipHash,
    user_agent: h.get("user-agent"),
    // Attributes this lead to the analytics session/visitor that made
    // it, for "Form Submissions by Traffic Source" / "Contacts by
    // Source" — null if the visitor somehow never triggered the beacon
    // (e.g. JS disabled) rather than blocking the submission on it.
    session_id: cookieStore.get(SESSION_COOKIE)?.value ?? null,
    visitor_id: cookieStore.get(VISITOR_COOKIE)?.value ?? null,
  });

  if (error) {
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  // A submission is never lost to a notification failure — it's already
  // durably saved above. `notify` itself should already be best-effort
  // (see sendContactNotification/sendFormNotification), but this catch is
  // a safety net against a caller-supplied notify() that isn't.
  try {
    await params.notify();
  } catch (err) {
    console.error(`[forms] Notification failed for form "${params.formKey}":`, err);
  }

  return { status: "success" };
}
