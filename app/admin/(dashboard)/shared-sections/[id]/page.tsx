import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getSharedSectionById, listAllSharedSections } from "@/lib/data/shared-sections";
import { RelationOptionsProvider } from "@/components/admin/relation-options";
import { SHARED_SECTIONS_RELATION, sharedSectionOptions } from "@/lib/admin/shared-section-options";
import { getBlockPalette } from "@/lib/blocks/registry";
import { SharedSectionEditor } from "@/app/admin/(dashboard)/shared-sections/[id]/shared-section-editor";
import { getPublishedBranding } from "@/lib/data/branding";
import { OSI_SEED_BRANDING_CONFIG } from "@/lib/branding/seed";
import { PublishedBrandingOptionsProvider } from "@/components/admin/block-appearance-fields";

export const dynamic = "force-dynamic";

// Not using the generated `PageProps<"/admin/shared-sections/[id]">`
// helper — same reasoning as app/admin/(dashboard)/forms/[id]/page.tsx.
export default async function EditSharedSectionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  const { id } = await params;
  const section = await getSharedSectionById(id);
  if (!section) notFound();

  const [palette, branding, allSections] = await Promise.all([
    getBlockPalette(),
    getPublishedBranding(),
    listAllSharedSections(),
  ]);

  return (
    <PublishedBrandingOptionsProvider branding={branding?.config ?? OSI_SEED_BRANDING_CONFIG}>
      <RelationOptionsProvider options={{ [SHARED_SECTIONS_RELATION]: sharedSectionOptions(allSections, section.key) }}>
        <SharedSectionEditor section={section} palette={palette} role={session.role} />
      </RelationOptionsProvider>
    </PublishedBrandingOptionsProvider>
  );
}
