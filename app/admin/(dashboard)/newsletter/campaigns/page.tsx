import { requireCapability } from "@/lib/auth";
import { listCampaignsAction } from "@/lib/actions/newsletter-campaigns";
import { getNewsletterReadiness } from "@/lib/newsletter/readiness";
import { hasCapability } from "@/lib/auth/capabilities";
import { CampaignsList } from "@/app/admin/(dashboard)/newsletter/campaigns/campaigns-list";

export const dynamic = "force-dynamic";

export default async function NewsletterCampaignsPage() {
  const session = await requireCapability("manage_newsletter");
  const campaigns = await listCampaignsAction();
  return <CampaignsList campaigns={campaigns} readiness={getNewsletterReadiness()} canDelete={hasCapability(session.role, "delete_content")} />;
}
