import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

// Every route here reads live, draft/published-gated content straight
// from Supabase (and lib/db/client.ts touches cookies() for session
// handling) — cacheComponents is intentionally off (see CLAUDE.md), so
// force dynamic rendering rather than let Next attempt to statically
// prerender pages whose content can change via the admin at any time.
export const dynamic = "force-dynamic";

// Wraps every public marketing page with the site chrome. Deliberately
// excludes /styleguide (isolated design reference) and the future
// /admin (Phase 5) — those live outside this route group.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
