import { describe, expect, it } from "vitest";
import {
  contactConfirmationEmail,
  contactNotificationEmail,
  formNotificationEmail,
  newsletterConfirmEmail,
  newsletterWelcomeEmail,
} from "@/lib/email-templates";
import type { EmailBrand } from "@/lib/email-brand";

const brand: EmailBrand = {
  siteName: "Odessa Separator",
  logoUrl: "https://odessaseparator.com/logo.png",
  logoAlt: "Odessa Separator",
  headerBackground: "#001B33",
  headerText: "#FFFFFF",
  link: "#001B33",
  pageBackground: "#F2E9DE",
};

const contact = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  company: "Analytical Engines",
  phone: "555-0100",
  message: "Do you ship <b>internationally</b>?",
  pageSlug: "contact",
};

function expectCommon(email: { subject: string; html: string; text: string }) {
  expect(email.subject.length).toBeGreaterThan(0);
  expect(email.html).toContain('lang="en"');
  expect(email.text.trim().length).toBeGreaterThan(0);
  // No tracking: no pixels, no 1x1 images, no external beacons.
  expect(email.html).not.toMatch(/width="1"|height="1"|pixel|track/i);
  expect((email.html.match(/<img/g) ?? []).length).toBeLessThanOrEqual(1);
}

describe("contactNotificationEmail", () => {
  it("lists every field in both bodies and escapes visitor input in the HTML", async () => {
    const email = await contactNotificationEmail(brand, contact);
    expectCommon(email);
    expect(email.subject).toBe("New contact form submission — Ada Lovelace");
    for (const value of ["Ada Lovelace", "ada@example.com", "Analytical Engines", "555-0100", "/contact"]) {
      expect(email.html).toContain(value);
      expect(email.text).toContain(value);
    }
    expect(email.html).not.toContain("<b>internationally</b>");
    expect(email.html).toContain("&lt;b&gt;internationally&lt;/b&gt;");
  });

  it("omits the company row when none was given", async () => {
    const email = await contactNotificationEmail(brand, { ...contact, company: undefined });
    expect(email.text).not.toContain("Company");
  });
});

describe("contactConfirmationEmail", () => {
  it("greets the visitor by first name and repeats their message", async () => {
    const email = await contactConfirmationEmail(brand, contact);
    expectCommon(email);
    expect(email.text).toContain("Hi Ada");
    expect(email.text).toContain("internationally");
  });
});

describe("formNotificationEmail", () => {
  it("renders non-empty fields only", async () => {
    const email = await formNotificationEmail(brand, {
      formName: "Quote request",
      payload: { email: "a@b.co", product: "ESP Chem Screen", notes: "", extra: null },
    });
    expectCommon(email);
    expect(email.subject).toBe("New submission — Quote request");
    expect(email.text).toContain("ESP Chem Screen");
    expect(email.text).not.toContain("notes");
  });
});

describe("newsletterConfirmEmail", () => {
  it("puts the absolute confirm link in the button and the plain text", async () => {
    const confirmUrl = "https://odessaseparator.com/newsletter/confirm?token=abc.def";
    const email = await newsletterConfirmEmail(brand, { confirmUrl });
    expectCommon(email);
    expect(email.html).toContain(`href="${confirmUrl}"`);
    expect(email.text).toContain(confirmUrl);
    expect(email.text).toMatch(/ignore this email/i);
  });
});

describe("newsletterWelcomeEmail", () => {
  it("carries a working unsubscribe link", async () => {
    const unsubscribeUrl = "https://odessaseparator.com/newsletter/unsubscribe?token=abc.def";
    const email = await newsletterWelcomeEmail(brand, { unsubscribeUrl });
    expectCommon(email);
    expect(email.html).toContain(`href="${unsubscribeUrl}"`);
    expect(email.text).toContain(unsubscribeUrl);
  });
});

describe("branding", () => {
  it("falls back to the site name when there is no logo", async () => {
    const email = await newsletterConfirmEmail({ ...brand, logoUrl: null }, { confirmUrl: "https://x.test/c" });
    expect(email.html).not.toContain("<img");
    expect(email.html).toContain("ODESSA SEPARATOR");
  });

  it("uses the branding colors", async () => {
    const email = await newsletterConfirmEmail({ ...brand, headerBackground: "#123456" }, { confirmUrl: "https://x.test/c" });
    expect(email.html.toLowerCase()).toContain("#123456");
  });
});
