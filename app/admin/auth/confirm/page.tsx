import type { Metadata } from "next";
import Link from "next/link";
import { confirmEmailTokenAction } from "@/lib/actions/auth";

export const metadata: Metadata = { title: "Confirm — OSI Admin", robots: { index: false } };

const COPY = {
  recovery: { heading: "Reset your password", body: "Continue to choose a new password for your admin account.", button: "Continue" },
  invite: { heading: "Accept your invitation", body: "Continue to set a password and activate your admin account.", button: "Accept invitation" },
} as const;

/**
 * Landing page for the token-hash links in the Supabase recovery/invite
 * emails. Rendering this page verifies NOTHING: mail scanners prefetch
 * every link, and verifying here would consume the one-time token before
 * the person clicks. Verification happens only when the button below is
 * pressed (a POST to confirmEmailTokenAction).
 */
export default async function ConfirmPage({ searchParams }: PageProps<"/admin/auth/confirm">) {
  const params = await searchParams;
  const tokenHash = typeof params.token_hash === "string" ? params.token_hash : "";
  const type = params.type === "recovery" || params.type === "invite" ? params.type : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-osi-navy-900 px-6">
      <div className="w-full max-w-sm">
        {tokenHash && type ? (
          <>
            <h1 className="mb-8 text-center font-display text-2xl tracking-wide-display text-osi-white uppercase">
              {COPY[type].heading}
            </h1>
            <form
              action={confirmEmailTokenAction}
              className="space-y-4 rounded border border-osi-steel-500/30 bg-osi-navy-800 p-8 text-center text-sm text-osi-white"
            >
              <p>{COPY[type].body}</p>
              <input type="hidden" name="token_hash" value={tokenHash} />
              <input type="hidden" name="type" value={type} />
              <button
                type="submit"
                className="w-full rounded bg-osi-gold-500 py-2 font-display text-sm tracking-wide-display text-osi-navy-900 uppercase transition-colors hover:bg-osi-gold-400"
              >
                {COPY[type].button}
              </button>
            </form>
          </>
        ) : (
          <div
            role="status"
            className="space-y-4 rounded border border-osi-steel-500/30 bg-osi-navy-800 p-8 text-center text-sm text-osi-white"
          >
            <p>This link is invalid or incomplete.</p>
            <Link href="/admin/forgot-password" className="text-osi-gold-500 hover:underline">
              Request a new one
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
