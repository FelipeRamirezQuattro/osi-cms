import type { Metadata } from "next";
import { NewsletterTokenForm } from "@/components/newsletter/token-form";
import { Section } from "@/components/ui/section";
import { StatusMessage } from "@/components/ui/public-primitives";
import { verifySubscriberToken } from "@/lib/newsletter/tokens";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

export default async function UnsubscribeNewsletterPage({ searchParams }: PageProps<"/newsletter/unsubscribe">) {
  const { token } = await searchParams;
  const value = typeof token === "string" ? token : "";
  const valid = verifySubscriberToken("unsubscribe", value) !== null;

  return (
    <Section background="cream" spacingTop="lg" spacingBottom="lg">
      <h1 className="mb-6 font-editorial text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-none text-balance">
        Unsubscribe
      </h1>
      <div className="max-w-xl">
        {valid ? (
          <>
            <p className="mb-6 text-base leading-relaxed">Press the button to stop receiving Odessa Separator newsletters.</p>
            <NewsletterTokenForm mode="unsubscribe" token={value} />
          </>
        ) : (
          <StatusMessage tone="error" title="This link isn't valid">
            It may be incomplete or out of date. Please use the unsubscribe link in your most recent email.
          </StatusMessage>
        )}
      </div>
    </Section>
  );
}
