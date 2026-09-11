import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/db/database.types";

/**
 * The one client-side exception to "auth goes behind lib/auth" staying
 * server-only, AND to lib/db/client.ts being the sole @supabase/ssr
 * client-constructor boundary: importing lib/db/client.ts here pulls in
 * its `next/headers` import too (Next.js bundles the whole module, not
 * just the one function actually used), which breaks the client build
 * outright ("next/headers ... only available in Server Components").
 * Constructing the browser client directly is the only way around that.
 *
 * Used only by the password-reset callback (app/admin/reset-password),
 * which has to read the recovery session out of the URL *hash fragment*
 * and call `updateUser` — both of which only make sense running in the
 * browser; there is no server request that ever sees a hash fragment.
 */
export function getBrowserAuth() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  ).auth;
}
