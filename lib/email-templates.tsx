import { render } from "@react-email/render";
import { TransactionalEmail, type TransactionalEmailProps } from "@/components/email/transactional/transactional-email";
import type { EmailBrand } from "@/lib/email-brand";

/**
 * Every transactional message as { subject, html, text }. Pure: the brand is
 * passed in (see lib/email-brand.ts) and URLs arrive already absolute, built
 * by the caller with absoluteUrl(). Both bodies come from the same React
 * element so they can't drift apart.
 */
export type RenderedEmail = { subject: string; html: string; text: string };

async function renderEmail(subject: string, props: TransactionalEmailProps): Promise<RenderedEmail> {
  const element = <TransactionalEmail {...props} />;
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { subject, html, text };
}

export type ContactDetails = {
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  phone: string;
  message: string;
  pageSlug?: string;
};

function contactRows(payload: ContactDetails) {
  return [
    { label: "Name", value: `${payload.firstName} ${payload.lastName}` },
    { label: "Email", value: payload.email },
    ...(payload.company ? [{ label: "Company", value: payload.company }] : []),
    { label: "Phone", value: payload.phone },
    ...(payload.pageSlug ? [{ label: "From page", value: `/${payload.pageSlug}` }] : []),
    { label: "Message", value: payload.message },
  ];
}

/** To OSI staff. Reply-To is set to the visitor by the sender. */
export function contactNotificationEmail(brand: EmailBrand, payload: ContactDetails): Promise<RenderedEmail> {
  return renderEmail(`New contact form submission — ${payload.firstName} ${payload.lastName}`, {
    brand,
    preheader: `${payload.firstName} ${payload.lastName} sent a message through the website.`,
    heading: "New contact form submission",
    paragraphs: ["Someone sent a message through the website contact form. Reply to this email to answer them directly."],
    details: contactRows(payload),
    footnote: "This submission is also saved under Submissions in the website admin.",
  });
}

/** To the visitor: confirms receipt and repeats what they sent. */
export function contactConfirmationEmail(brand: EmailBrand, payload: ContactDetails): Promise<RenderedEmail> {
  return renderEmail(`We received your message — ${brand.siteName}`, {
    brand,
    preheader: "Thanks for contacting us. A member of our team will be in touch.",
    heading: "Thanks for getting in touch",
    paragraphs: [
      `Hi ${payload.firstName}, we received your message and a member of the ${brand.siteName} team will reply as soon as possible.`,
      "For your records, this is what you sent us:",
    ],
    details: [{ label: "Message", value: payload.message }],
    footnote: "You are receiving this one-time confirmation because you used the contact form on our website. If this wasn’t you, you can ignore this email.",
  });
}

export function formNotificationEmail(
  brand: EmailBrand,
  params: { formName: string; payload: Record<string, unknown> },
): Promise<RenderedEmail> {
  const details = Object.entries(params.payload)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([label, value]) => ({ label, value: String(value) }));
  return renderEmail(`New submission — ${params.formName}`, {
    brand,
    preheader: `New submission to "${params.formName}".`,
    heading: `New submission: ${params.formName}`,
    paragraphs: ["A visitor submitted a form on the website."],
    details,
    footnote: "This submission is also saved under Submissions in the website admin.",
  });
}

/** Double opt-in: nobody is subscribed until they press the button. */
export function newsletterConfirmEmail(brand: EmailBrand, params: { confirmUrl: string }): Promise<RenderedEmail> {
  return renderEmail(`Confirm your subscription to ${brand.siteName} news`, {
    brand,
    preheader: "One more step: confirm your email address to finish subscribing.",
    heading: "Confirm your subscription",
    paragraphs: [
      `Thanks for signing up for ${brand.siteName} news. Please confirm your email address to finish subscribing.`,
    ],
    button: { label: "Confirm subscription", url: params.confirmUrl },
    footnote: "If you didn’t sign up, you can ignore this email — you won’t be subscribed.",
  });
}

export function newsletterWelcomeEmail(brand: EmailBrand, params: { unsubscribeUrl: string }): Promise<RenderedEmail> {
  return renderEmail(`Welcome to ${brand.siteName} news`, {
    brand,
    preheader: "You’re subscribed. Here’s what to expect.",
    heading: "You’re subscribed",
    paragraphs: [
      `Thanks for confirming. You’ll now receive occasional ${brand.siteName} news about products, services and events.`,
    ],
    footnote: "You can unsubscribe at any time using the link below.",
    unsubscribeUrl: params.unsubscribeUrl,
  });
}
