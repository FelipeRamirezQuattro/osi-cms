import { requireAdmin } from "@/lib/auth";
import { MediaLibrary } from "@/app/admin/(dashboard)/media/media-library";

export const dynamic = "force-dynamic";

// MediaBrowser (components/admin/media/media-browser.tsx) fetches its
// own first page client-side via listMediaAction — no server-side
// initial fetch to hand it, since the browser now owns pagination/
// search/filter state that a static server-rendered list can't express.
export default async function MediaPage() {
  const session = await requireAdmin();
  return <MediaLibrary role={session.role} />;
}
