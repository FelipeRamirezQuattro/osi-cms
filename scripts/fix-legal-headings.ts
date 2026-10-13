/**
 * Heading hierarchy on the legal pages (QA, Oct 13: "headings rendered as
 * body text"). Edits the DRAFT rich text of terms-and-conditions and
 * privacy-policy only — the live page changes when someone publishes.
 *
 *  1. The three SMS-section titles are <p> elements on the live Wix page
 *     (styled, not headings), so they were migrated as body text. Promote
 *     exactly these strings: "SMS Terms and Conditions" (H2), "Opt-in
 *     Method" (H3), "Opt-Out Method" (H3). No guessing from text shape.
 *  2. "Interpretation and Definitions Interpretation" was two headings that
 *     the first migration merged; split it using the live heading pair.
 *  3. Heading levels follow the live page (its H1 → our H2, deeper → H3).
 *
 * Usage: pnpm exec tsx --env-file=.env.local scripts/fix-legal-headings.ts [--dry-run]
 */
import fs from "node:fs";
import path from "node:path";
import { createServiceRoleDbClient } from "../lib/db/client";

const DRY_RUN = process.argv.includes("--dry-run");
const PROMOTE: Record<string, number> = { "SMS Terms and Conditions": 2, "Opt-in Method": 3, "Opt-Out Method": 3 };

type Node = { type: string; attrs?: { level?: number }; content?: { type: string; text?: string }[] };
const textOf = (n: Node) => (n.content ?? []).map((c) => c.text ?? "").join("").trim();
const heading = (level: number, text: string): Node => ({ type: "heading", attrs: { level }, content: [{ type: "text", text }] });

async function main() {
  const db = createServiceRoleDbClient();
  const live = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "content", "legacy", "pages-targeted", "terms-and-conditions.json"), "utf-8")) as {
    items: { type: string; level?: number; text?: string }[];
  };
  const liveHeadings = live.items.filter((i) => i.type === "heading").map((i) => ({ text: i.text!, level: i.level! <= 1 ? 2 : 3 }));
  const levelByText = new Map(liveHeadings.map((h) => [h.text, h.level]));
  const report: Record<string, unknown>[] = [];

  for (const slug of ["terms-and-conditions", "privacy-policy"]) {
    const { data: page } = await db.from("pages").select("id").eq("slug", slug).eq("locale", "en").single();
    if (!page) continue;
    const { data: blocks } = await db.from("page_blocks").select("id,type,data").eq("page_id", page.id);
    for (const block of (blocks ?? []).filter((b) => b.type === "rich_text")) {
      const doc = (block.data as { content: { type: string; content: Node[] } }).content;
      let promoted = 0;
      let split = 0;
      let releveled = 0;
      const next: Node[] = [];
      for (const node of doc.content) {
        const t = textOf(node);
        if (node.type === "paragraph" && t in PROMOTE) {
          next.push(heading(PROMOTE[t], t));
          promoted++;
        } else if (node.type === "heading") {
          const pair = liveHeadings.findIndex((h, i) => !levelByText.has(t) && liveHeadings[i + 1] && `${h.text} ${liveHeadings[i + 1].text}` === t);
          if (pair >= 0 && slug === "terms-and-conditions") {
            next.push(heading(liveHeadings[pair].level, liveHeadings[pair].text), heading(liveHeadings[pair + 1].level, liveHeadings[pair + 1].text));
            split++;
          } else {
            const level = slug === "terms-and-conditions" ? levelByText.get(t) : undefined;
            if (level && level !== node.attrs?.level) {
              next.push(heading(level, t));
              releveled++;
            } else next.push(node);
          }
        } else next.push(node);
      }
      if (promoted + split + releveled === 0) continue;
      if (!DRY_RUN) {
        const { error } = await db.from("page_blocks").update({ data: { ...(block.data as object), content: { ...doc, content: next } } as never }).eq("id", block.id);
        if (error) throw error;
      }
      report.push({ slug, promoted_paragraphs_to_headings: promoted, merged_headings_split: split, heading_levels_fixed: releveled, applied: !DRY_RUN });
    }
  }
  console.log(JSON.stringify(report, null, 1));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
