import { listMediaAction } from "@/lib/actions/media";
import { MediaLibrary } from "@/app/admin/(dashboard)/media/media-library";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const assets = await listMediaAction();
  return <MediaLibrary initialAssets={assets} />;
}
