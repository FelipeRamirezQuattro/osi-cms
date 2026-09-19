import { NextResponse, type NextRequest } from "next/server";
import { unsubscribeSubscriber } from "@/lib/data/newsletter-subscribers";
import { verifySubscriberToken } from "@/lib/newsletter/tokens";

/**
 * RFC 8058 one-click unsubscribe — the target of the `List-Unsubscribe`
 * header on every campaign email. Mail providers (Gmail, Yahoo) POST here
 * when someone presses their own "Unsubscribe" button, with no page in
 * between, so this acts immediately on a valid signed token. (The emailed
 * *page* link, by contrast, only acts on a button press — see
 * app/(site)/newsletter/unsubscribe.)
 */
export async function POST(request: NextRequest) {
  const id = verifySubscriberToken("unsubscribe", request.nextUrl.searchParams.get("token"));
  if (!id) return new NextResponse("Invalid unsubscribe link.", { status: 400 });

  try {
    await unsubscribeSubscriber(id);
  } catch (err) {
    console.error("[newsletter] One-click unsubscribe failed:", err);
    return new NextResponse("Something went wrong.", { status: 500 });
  }
  return new NextResponse("Unsubscribed.", { status: 200 });
}

/** A person (or older client) opening the header URL directly gets the confirmation page instead of a silent state change. */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  return NextResponse.redirect(new URL(`/newsletter/unsubscribe?token=${encodeURIComponent(token)}`, request.nextUrl.origin), 303);
}
