import { render } from "@react-email/render";
import { NewsletterEmail } from "@/components/email/newsletter-email";
import { emailBlockRegistry, type EmailBlockInstance } from "@/lib/email-blocks/registry";
import type { EmailBlockContext } from "@/lib/email-blocks/types";
import { resolveMediaUrl } from "@/lib/media";
import { absoluteUrl } from "@/lib/seo";

/**
 * The email is rendered ONCE per send with this placeholder where the
 * recipient's unsubscribe URL goes, then swapped per recipient with a plain
 * string replace — cheaper and safer than re-rendering (and re-escaping) the
 * whole template for every subscriber.
 */
export const UNSUBSCRIBE_PLACEHOLDER = "%%UNSUBSCRIBE_URL%%";

export const SITE_NAME = "Odessa Separator";

const ABSOLUTE = /^(https?:\/\/|mailto:|tel:)/i;

const context: EmailBlockContext = {
  // Email clients can't resolve a site-relative path, so make it absolute.
  resolveUrl: (value) => (ABSOLUTE.test(value) ? value : absoluteUrl(value)),
  // Images go through the legacy-media seam (constraint 3). A value it can't
  // resolve (no NEXT_PUBLIC_LEGACY_MEDIA_BASE) falls back to a site URL
  // rather than failing the whole email.
  resolveImage: (value) => {
    try {
      return resolveMediaUrl(value);
    } catch {
      return absoluteUrl(value);
    }
  },
};

export type RenderedNewsletter = { html: string; text: string };

export async function renderNewsletterEmail(input: {
  subject: string;
  preheader: string;
  blocks: EmailBlockInstance[];
  /** Falls back to a visible placeholder so a preview shows what's missing; sending is blocked separately. */
  mailingAddress?: string | null;
}): Promise<RenderedNewsletter> {
  const rows = input.blocks.flatMap((block, index) => {
    const definition = emailBlockRegistry[block.type];
    if (!definition) return [];
    const { Render } = definition;
    return [<Render key={index} data={block.data} ctx={context} />];
  });

  const element = (
    <NewsletterEmail
      subject={input.subject}
      preheader={input.preheader}
      unsubscribeUrl={UNSUBSCRIBE_PLACEHOLDER}
      mailingAddress={input.mailingAddress || "[Mailing address not set]"}
      siteName={SITE_NAME}
    >
      {rows}
    </NewsletterEmail>
  );

  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { html, text };
}
