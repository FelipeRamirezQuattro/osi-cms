import { notFound } from "next/navigation";
import { requireCapability } from "@/lib/auth";
import { hasCapability } from "@/lib/auth/capabilities";
import { getCampaign, getCampaignStats } from "@/lib/data/newsletter-campaigns";
import { listTags } from "@/lib/data/newsletter-subscribers";
import { getEmailBlockPalette } from "@/lib/email-blocks/registry";
import { getNewsletterReadiness } from "@/lib/newsletter/readiness";
import { CampaignEditor } from "@/app/admin/(dashboard)/newsletter/campaigns/[id]/campaign-editor";

export const dynamic = "force-dynamic";
// A send is driven in repeated ~8s steps by the editor, but a step can run a
// little over its budget while a batch is in flight.
export const maxDuration = 60;

export default async function CampaignEditorPage({ params }: PageProps<"/admin/newsletter/campaigns/[id]">) {
  const session = await requireCapability("manage_newsletter");
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) notFound();

  const [tags, stats] = await Promise.all([listTags(), campaign.status === "draft" ? null : getCampaignStats(id)]);

  return (
    <CampaignEditor
      campaign={{
        id: campaign.id,
        name: campaign.name,
        subject: campaign.subject,
        preheader: campaign.preheader,
        tag_ids: campaign.tag_ids,
        blocks: (campaign.blocks as { type: string; data: Record<string, unknown> }[]) ?? [],
        status: campaign.status,
        total_recipients: campaign.total_recipients,
      }}
      tags={tags}
      palette={getEmailBlockPalette()}
      readiness={getNewsletterReadiness()}
      initialStats={stats}
      canSend={hasCapability(session.role, "publish")}
    />
  );
}
