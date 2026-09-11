import { listSubmissionsAction } from "@/lib/actions/submissions";
import { SubmissionsInbox } from "@/app/admin/(dashboard)/submissions/submissions-inbox";

export const dynamic = "force-dynamic";

export default async function SubmissionsPage() {
  const submissions = await listSubmissionsAction();
  return <SubmissionsInbox submissions={submissions} />;
}
