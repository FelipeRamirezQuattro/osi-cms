/* eslint-disable @next/next/no-head-element, @next/next/no-img-element -- standalone email document, not a Next.js page */
import type { EmailBrand } from "@/lib/email-brand";
import { EMAIL } from "@/components/email/email-styles";

export type TransactionalEmailProps = {
  brand: EmailBrand;
  /** Inbox preview text. */
  preheader: string;
  heading: string;
  paragraphs: string[];
  /** Label/value rows, e.g. the contact form fields. */
  details?: { label: string; value: string }[];
  button?: { label: string; url: string };
  /** Small print under the content (why the recipient got this). */
  footnote?: string;
  /** Present on mail to subscribers, so every such message carries an unsubscribe link. */
  unsubscribeUrl?: string;
};

/**
 * One shell for every transactional message (contact notification and
 * confirmation, newsletter confirm and welcome). Table layout and inline
 * styles because email clients ignore everything else. No images other than
 * the brand logo, and no tracking pixel.
 */
export function TransactionalEmail({ brand, preheader, heading, paragraphs, details, button, footnote, unsubscribeUrl }: TransactionalEmailProps) {
  return (
    <html lang="en">
      <head>
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{heading}</title>
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: brand.pageBackground }}>
        <div style={{ display: "none", overflow: "hidden", maxHeight: 0, maxWidth: 0, opacity: 0, fontSize: 1, lineHeight: "1px" }}>{preheader}</div>
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ backgroundColor: brand.pageBackground }}>
          <tbody>
            <tr>
              <td align="center" style={{ padding: "24px 12px" }}>
                <table role="presentation" width={EMAIL.width} cellPadding={0} cellSpacing={0} style={{ width: "100%", maxWidth: EMAIL.width, backgroundColor: EMAIL.white }}>
                  <tbody>
                    <tr>
                      <td style={{ backgroundColor: brand.headerBackground, padding: "20px 32px", fontFamily: EMAIL.font, fontSize: 14, fontWeight: 700, letterSpacing: "0.14em", color: brand.headerText }}>
                        {brand.logoUrl ? (
                          <img src={brand.logoUrl} alt={brand.logoAlt} height={32} style={{ display: "block", height: 32, width: "auto", border: 0 }} />
                        ) : (
                          brand.siteName.toUpperCase()
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "32px 32px 8px", fontFamily: EMAIL.font, color: EMAIL.ink }}>
                        <h1 style={{ margin: "0 0 16px", fontSize: 22, lineHeight: "30px", color: EMAIL.navy }}>{heading}</h1>
                        {paragraphs.map((paragraph, index) => (
                          <p key={index} style={{ margin: "0 0 16px", fontSize: 15, lineHeight: "24px" }}>
                            {paragraph}
                          </p>
                        ))}
                        {details && details.length > 0 && (
                          <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ margin: "0 0 16px", borderTop: `1px solid ${EMAIL.rule}` }}>
                            <tbody>
                              {details.map((row) => (
                                <tr key={row.label}>
                                  <td valign="top" style={{ padding: "8px 12px 8px 0", borderBottom: `1px solid ${EMAIL.rule}`, fontSize: 13, color: EMAIL.muted, width: 110 }}>
                                    {row.label}
                                  </td>
                                  <td valign="top" style={{ padding: "8px 0", borderBottom: `1px solid ${EMAIL.rule}`, fontSize: 14, whiteSpace: "pre-wrap" }}>
                                    {row.value}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                        {button && (
                          <p style={{ margin: "8px 0 24px" }}>
                            <a href={button.url} style={{ display: "inline-block", padding: "12px 24px", backgroundColor: brand.link, color: EMAIL.white, textDecoration: "none", fontSize: 14, fontWeight: 700 }}>
                              {button.label}
                            </a>
                          </p>
                        )}
                        {button && (
                          <p style={{ margin: "0 0 16px", fontSize: 12, lineHeight: "18px", color: EMAIL.muted, wordBreak: "break-all" }}>
                            If the button doesn&rsquo;t work, copy this link into your browser: {button.url}
                          </p>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "16px 32px 24px", borderTop: `1px solid ${EMAIL.rule}`, fontFamily: EMAIL.font, fontSize: 12, lineHeight: "18px", color: EMAIL.muted }}>
                        {footnote && <p style={{ margin: "0 0 8px" }}>{footnote}</p>}
                        {unsubscribeUrl && (
                          <p style={{ margin: "0 0 8px" }}>
                            <a href={unsubscribeUrl} style={{ color: brand.link, textDecoration: "underline" }}>
                              Unsubscribe
                            </a>
                          </p>
                        )}
                        <p style={{ margin: 0 }}>{brand.siteName}</p>
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
