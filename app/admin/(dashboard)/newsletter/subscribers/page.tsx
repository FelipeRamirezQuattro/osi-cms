import { requireAdmin, requireCapability } from "@/lib/auth";
import { listSubscribersAction } from "@/lib/actions/newsletter-subscribers";
import { SubscribersAdmin } from "@/app/admin/(dashboard)/newsletter/subscribers/subscribers-admin";

export const dynamic = "force-dynamic";

export default async function NewsletterSubscribersPage() {
  await requireCapability("manage_newsletter");
  const session = await requireAdmin();
  const { subscribers, tags } = await listSubscribersAction();
  return <SubscribersAdmin subscribers={subscribers} tags={tags} role={session.role} />;
}
