/* eslint-disable @next/next/no-head-element -- this renders a standalone email document, not a Next.js page, so next/head does not apply */
import type { ReactNode } from "react";
import { EMAIL } from "@/components/email/email-styles";

/**
 * The fixed newsletter shell: header band, editor-built content, and a legal
 * footer. The footer is deliberately not a block — every email carries a
 * working unsubscribe link and the sender's mailing address (CAN-SPAM /
 * GDPR), and an editor must not be able to drop them.
 */
export function NewsletterEmail({
  subject,
  preheader,
  children,
  unsubscribeUrl,
  mailingAddress,
  siteName,
}: {
  subject: string;
  preheader: string;
  children: ReactNode;
  unsubscribeUrl: string;
  mailingAddress: string;
  siteName: string;
}) {
  return (
    <html lang="en">
      <head>
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{subject}</title>
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: EMAIL.cream }}>
        {preheader && (
          // Inbox preview text; hidden in the message body itself.
          <div style={{ display: "none", overflow: "hidden", maxHeight: 0, maxWidth: 0, opacity: 0, fontSize: 1, lineHeight: "1px", color: EMAIL.cream }}>
            {preheader}
          </div>
        )}
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ backgroundColor: EMAIL.cream }}>
          <tbody>
            <tr>
              <td align="center" style={{ padding: "24px 12px" }}>
                <table role="presentation" width={EMAIL.width} cellPadding={0} cellSpacing={0} style={{ width: "100%", maxWidth: EMAIL.width, backgroundColor: EMAIL.white }}>
                  <tbody>
                    <tr>
                      <td style={{ backgroundColor: EMAIL.navy, padding: "20px 32px", fontFamily: EMAIL.font, fontSize: 14, fontWeight: 700, letterSpacing: "0.14em", color: EMAIL.white }}>
                        {siteName.toUpperCase()}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ paddingTop: 24 }}>
                        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
                          <tbody>{children}</tbody>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "24px 32px", borderTop: `1px solid ${EMAIL.rule}`, fontFamily: EMAIL.font, fontSize: 12, lineHeight: "18px", color: EMAIL.muted }}>
                        <p style={{ margin: "0 0 8px" }}>You&rsquo;re receiving this because you subscribed to {siteName} news.</p>
                        <p style={{ margin: "0 0 8px" }}>
                          <a href={unsubscribeUrl} style={{ color: EMAIL.navy, textDecoration: "underline" }}>
                            Unsubscribe
                          </a>
                        </p>
                        <p style={{ margin: 0 }}>{mailingAddress}</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}
