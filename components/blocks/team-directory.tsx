import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { AnimatedGroup, AnimatedItem } from "@/components/ui/animated-group";
import { listDirectoryContacts } from "@/lib/data/locations";
import type { Tables } from "@/lib/db/database.types";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

const schema = blockCommonSchema.extend({
  title: z.string().optional(),
});

type Data = z.infer<typeof schema>;

function groupByDepartment(contacts: Tables<"directory_contacts">[]) {
  const groups = new Map<string, Tables<"directory_contacts">[]>();
  for (const contact of contacts) {
    const list = groups.get(contact.department) ?? [];
    list.push(contact);
    groups.set(contact.department, list);
  }
  return groups;
}

async function Render({ data }: { data: Data }) {
  const contacts = await listDirectoryContacts();
  const groups = groupByDepartment(contacts);

  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
      reveal={false}
    >
      {data.title && (
        <h2 className="mb-8 font-display text-section tracking-tightest-display uppercase">
          {data.title}
        </h2>
      )}
      <div className="space-y-10">
        {[...groups.entries()].map(([department, people]) => (
          <div key={department}>
            <h3 className="mb-4 font-display text-small-label tracking-wide-label uppercase opacity-60">
              {department}
            </h3>
            <AnimatedGroup className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {people.map((person) => (
                <AnimatedItem key={person.id}>
                  <div className="text-sm">
                    <p className="font-display tracking-wide-display uppercase">{person.name}</p>
                    {person.role && <p className="opacity-70">{person.role}</p>}
                    {person.phone_office && <p className="mt-1">Office: {person.phone_office}</p>}
                    {person.phone_cell && <p>Cell: {person.phone_cell}</p>}
                    {person.email && <p className="opacity-70">{person.email}</p>}
                  </div>
                </AnimatedItem>
              ))}
            </AnimatedGroup>
          </div>
        ))}
        {groups.size === 0 && (
          <p className="text-sm text-osi-slate-400">No published directory entries yet.</p>
        )}
      </div>
    </Section>
  );
}

const adminFields: FieldSpec[] = [{ key: "title", label: "Title", type: "text", optional: true }];

export const teamDirectoryBlock = defineBlock({
  type: "team_directory",
  label: "Team directory",
  category: "content",
  description: "Auto-pulls every published directory_contacts row grouped by department — one per site (e.g. a staff/directory page), not for a curated subset of people.",
  schema,
  adminFields,
  defaults: { background: "cream", spacingTop: "md", spacingBottom: "md" },
  Render,
});
