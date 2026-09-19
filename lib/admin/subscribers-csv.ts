import { csvField } from "@/lib/admin/submissions-csv";
import type { NewsletterSubscriberWithTags, NewsletterTag } from "@/lib/data/newsletter-subscribers";

const COLUMNS = ["email", "status", "tags", "source", "page_slug", "consented_at", "confirmed_at", "unsubscribed_at", "created_at"] as const;

/**
 * Subscriber export (portability/compliance). Tags are joined into one
 * semicolon-separated cell, and every cell goes through the same
 * formula-injection-safe escaper as the submissions export — an email like
 * `=cmd|...@x.com` is attacker-supplied.
 */
export function buildSubscribersCsv(rows: NewsletterSubscriberWithTags[], tags: NewsletterTag[]): string {
  const tagName = new Map(tags.map((tag) => [tag.id, tag.name]));
  const lines: string[] = [COLUMNS.join(",")];
  for (const row of rows) {
    const values = [
      row.email,
      row.status,
      row.tag_ids.map((id) => tagName.get(id)).filter(Boolean).join("; "),
      row.source,
      row.page_slug ?? "",
      row.consented_at,
      row.confirmed_at ?? "",
      row.unsubscribed_at ?? "",
      row.created_at,
    ];
    lines.push(values.map((value) => csvField(String(value))).join(","));
  }
  return lines.join("\r\n") + "\r\n";
}
