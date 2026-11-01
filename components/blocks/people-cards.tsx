import Image from "next/image";
import { z } from "zod";
import { resolveMediaUrl } from "@/lib/media";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { requiredString } from "@/lib/validation/common";
import type { FieldSpec } from "@/lib/blocks/admin-fields";
import { longTitle } from "@/lib/text/long-title";

const phoneSchema = z.object({
  label: z.string().optional(),
  number: requiredString("Phone number"),
});

const cardSchema = z
  .object({
    name: requiredString("Name"),
    region: z.string().optional(),
    company: z.string().optional(),
    title: z.string().optional(),
    // Only when it differs from the head office, which the footer already shows.
    address: z.string().optional(),
    phones: z.array(phoneSchema).default([]),
    emails: z.array(z.string().includes("@", { message: "Email must contain @" })).default([]),
    logoUrl: z.string().optional(),
    logoAlt: z.string().optional(),
  })
  .superRefine((card, ctx) => {
    if (card.logoUrl && !card.logoAlt?.trim()) {
      ctx.addIssue({ code: "custom", path: ["logoAlt"], message: "Alt text is required for the logo" });
    }
  });

const schema = blockCommonSchema.extend({
  title: z.string().optional(),
  cards: z.array(cardSchema).min(1),
});

type Data = z.infer<typeof schema>;

/** "+1 (432) 580-7111" → "tel:+14325807111". */
export const telHref = (number: string) => `tel:${number.replace(/[^\d+]/g, "")}`;

const LINK = "underline decoration-current/40 underline-offset-4 hover:decoration-current";

function Render({ data }: { data: Data }) {
  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
    >
      {data.title && (
        <h2 {...longTitle(data.title)} className="mb-8 font-editorial text-section font-semibold text-balance">
          {data.title}
        </h2>
      )}
      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data.cards.map((card, i) => (
          <li key={`${card.name}-${i}`} className="flex flex-col gap-3 border border-current/15 p-5 text-sm leading-relaxed">
            {card.logoUrl && (
              <Image
                src={resolveMediaUrl(card.logoUrl)}
                alt={card.logoAlt ?? ""}
                width={200}
                height={64}
                className="h-12 w-auto max-w-full self-start object-contain object-left"
              />
            )}
            <div>
              {card.region && <p className="text-xs uppercase tracking-wide-label opacity-70">{card.region}</p>}
              {card.company && <p className="font-semibold">{card.company}</p>}
              <p className={card.company ? "" : "font-editorial text-lg font-semibold"}>{card.name}</p>
              {card.title && <p className="opacity-70">{card.title}</p>}
            </div>
            {card.address && <p className="whitespace-pre-line opacity-80">{card.address}</p>}
            {(card.phones.length > 0 || card.emails.length > 0) && (
              <ul className="space-y-1">
                {card.phones.map((phone, k) => (
                  <li key={`p${k}`}>
                    {phone.label && <span className="opacity-70">{phone.label}: </span>}
                    <a href={telHref(phone.number)} className={LINK}>
                      {phone.number}
                    </a>
                  </li>
                ))}
                {card.emails.map((email, k) => (
                  <li key={`e${k}`} className="break-words">
                    <a href={`mailto:${email}`} className={LINK}>
                      {email}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}

const adminFields: FieldSpec[] = [
  { key: "title", label: "Section heading", type: "text", optional: true },
  {
    key: "cards",
    label: "People",
    type: "array",
    minItems: 1,
    itemFields: [
      { key: "name", label: "Name", type: "text" },
      { key: "region", label: "State / region (distributors)", type: "text", optional: true },
      { key: "company", label: "Company (distributors)", type: "text", optional: true },
      { key: "title", label: "Job title", type: "text", optional: true },
      { key: "address", label: "Address (only if not the head office)", type: "text", optional: true },
      {
        key: "phones",
        label: "Phones",
        type: "array",
        optional: true,
        itemFields: [
          { key: "label", label: "Label (Cell, Office…)", type: "text", optional: true },
          { key: "number", label: "Number", type: "text" },
        ],
      },
      { key: "emails", label: "Emails", type: "array", optional: true },
      { key: "logoUrl", label: "Logo", type: "image", optional: true },
      { key: "logoAlt", label: "Logo alt text", type: "text", optional: true },
    ],
  },
];

export const peopleCardsBlock = defineBlock({
  type: "people_cards",
  label: "People cards",
  category: "content",
  description:
    "A grid of contact cards (name, title, phone and email links, optional logo) — 3–4 per row on desktop, 1 on phones. One block per group (e.g. US Sales, Distributors).",
  schema,
  adminFields,
  defaults: { background: "cream", spacingTop: "md", spacingBottom: "md", cards: [{ name: "Name", phones: [], emails: [] }] },
  Render,
});
