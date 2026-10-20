import { listSubmissionsAction } from "@/lib/actions/submissions";
import { EmailStatusBanner } from "@/components/admin/email-status-banner";
import { SubmissionsInbox } from "@/app/admin/(dashboard)/submissions/submissions-inbox";

export const dynamic = "force-dynamic";

export default async function SubmissionsPage() {
  const submissions = await listSubmissionsAction();
  return (
    <div className="space-y-6">
      <EmailStatusBanner />
      <SubmissionsInbox submissions={submissions} />
    </div>
  );
}
