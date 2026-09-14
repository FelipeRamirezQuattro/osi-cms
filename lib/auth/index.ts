import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { createServerDbClient } from "@/lib/db/client";
import { hasCapability, type Capability } from "@/lib/auth/capabilities";

/**
 * Thin auth adapter (see CLAUDE.md constraint 2) — the only place
 * outside lib/db/client.ts that talks to @supabase/ssr directly, and
 * only because proxy.ts runs in a middleware context that can't use
 * next/headers' cookies() (that's RSC/route-handler only), so it needs
 * its own client construction wired to NextRequest/NextResponse cookies.
 */

export type AdminRole = "admin" | "editor";
export type AdminSession = {
  userId: string;
  email: string;
  role: AdminRole;
  fullName: string | null;
};

// Called from proxy.ts for every /admin/* request (except /admin/login).
export async function guardAdminRequest(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoginPage = request.nextUrl.pathname === "/admin/login";
  // These don't need (and, for reset-password, can't have yet — the
  // recovery session from the email link's URL hash is only
  // establishable client-side, after this server-side check already
  // ran) an existing admin session.
  const isPublicAuthPage =
    isLoginPage ||
    request.nextUrl.pathname === "/admin/forgot-password" ||
    request.nextUrl.pathname === "/admin/reset-password";

  if (!user) {
    if (isPublicAuthPage) return response;
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (isLoginPage) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile?.is_active) {
    await supabase.auth.signOut();
    const url = new URL("/admin/login", request.url);
    url.searchParams.set("error", "not-authorized");
    return NextResponse.redirect(url);
  }

  return response;
}

export async function signInWithPassword(email: string, password: string) {
  const db = createServerDbClient();
  return db.auth.signInWithPassword({ email, password });
}

export async function signOutCurrentUser() {
  const db = createServerDbClient();
  return db.auth.signOut();
}

/**
 * Sends a password-reset email. Supabase's link redirects the browser to
 * `redirectTo` with the recovery session in the URL *hash fragment*
 * (`#access_token=...&type=recovery`, implicit flow — confirmed by a
 * real expired-link error landing on `/#error=...&error_code=otp_expired`)
 * — that's never sent to the server, so establishing the session from it
 * has to happen client-side. See app/admin/reset-password/.
 */
export async function requestPasswordReset(email: string, redirectTo: string) {
  const db = createServerDbClient();
  return db.auth.resetPasswordForEmail(email, { redirectTo });
}

/** Server Components / Server Actions only — reads the current session. */
export async function getCurrentAdmin(): Promise<AdminSession | null> {
  const db = createServerDbClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;

  const { data: profile } = await db
    .from("admin_profiles")
    .select("role, full_name, is_active")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile?.is_active) return null;

  return {
    userId: user.id,
    email: user.email ?? "",
    role: profile.role as AdminRole,
    fullName: profile.full_name,
  };
}

/** Redirects to /admin/login if not signed in as active staff. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getCurrentAdmin();
  if (!session) redirect("/admin/login");
  return session;
}

/** Redirects to /admin if signed in but not role='admin'. */
export async function requireAdminRole(): Promise<AdminSession> {
  const session = await requireAdmin();
  if (session.role !== "admin") redirect("/admin");
  return session;
}

/** Every Server Action checks an explicit capability at its own boundary. */
export async function requireCapability(capability: Capability): Promise<AdminSession> {
  const session = await requireAdmin();
  if (!hasCapability(session.role, capability)) redirect("/admin?error=not-authorized");
  return session;
}

/**
 * Shared by saveProductAction and saveEntityAction — the two admin
 * "save this row's fields" actions that also expose an editable
 * `status` (draft/published) field alongside ordinary content. `edit_
 * drafts` alone lets an editor create/edit a draft row, or edit fields
 * on an already-published row without touching its status — but an
 * editor must not be the one to flip a row into or out of `published`,
 * per the plan's "editor can create and edit content but not publish
 * it" constraint. Call this with the row's status *before* the save and
 * the status the incoming payload would set; it's a no-op unless that's
 * actually a transition to or from "published", in which case it
 * requires the `publish` capability on top of `edit_drafts`.
 *
 * Must be called outside any try/catch that would swallow redirect()'s
 * throw (same reasoning as every other requireCapability call in this
 * file) — see saveProductAction/saveEntityAction for the call site.
 */
export async function requirePublishCapabilityForStatusChange(
  currentStatus: string | null | undefined,
  nextStatus: string | null | undefined,
): Promise<void> {
  if (nextStatus === currentStatus) return;
  if (nextStatus !== "published" && currentStatus !== "published") return;
  await requireCapability("publish");
}
