/**
 * W3 — lists every PUBLISHED item whose <title> or meta description comes
 * from a fallback instead of a value someone wrote for search results, so
 * OSI can fill the gaps. Read-only. Prints a table and writes
 * docs/seo-fallbacks.csv (the file to send to OSI).
 *
 * Run: pnpm report:seo-fallbacks
 *
 * Title fallback  = the item has an SEO title field and it is empty, so the
 *                   page/product name is used.
 * Description fallback = no SEO description (pages, products) or excerpt /
 *                   description (news, blog, industries, applications), so
 *                   the text is derived from the content, or — when there is
 *                   none — the generic site description is used.
 *
 * Uses the service-role client for the same reason as
 * report-content-integrity.ts: lib/data/* needs a Next request context.
 */
import { writeFileSync } from "node:fs";
import { createServiceRoleDbClient } from "../lib/db/client";
import { cleanSeoTitle, deriveDescriptionFromBlocks, resolveDescription, richTextParagraphs, type DescriptionSource } from "../lib/seo-content";

type Row = {
  type: string;
  url: string;
  title: string;
  titleSource: "seo_title" | "name/title (fallback)" | "name/title (no SEO title field)";
  description: string;
  descriptionSource: DescriptionSource;
};

const db = createServiceRoleDbClient();

function must<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data as T;
}

async function collect(): Promise<Row[]> {
  const rows: Row[] = [];

  const pages = must(await db.from("page_publications").select("slug, snapshot"), "page_publications") as {
    slug: string;
    snapshot: { meta: { title: string; seo_title: string | null; seo_description: string | null; noindex: boolean }; blocks: { type: string; data: unknown; is_visible: boolean; position: number }[] };
  }[];
  for (const page of pages) {
    if (page.snapshot.meta.noindex) continue;
    const blocks = page.snapshot.blocks.filter((b) => b.is_visible).sort((a, b) => a.position - b.position);
    const { description, source } = resolveDescription(page.snapshot.meta.seo_description, () => deriveDescriptionFromBlocks(blocks));
    const seoTitle = page.snapshot.meta.seo_title?.trim();
    rows.push({
      type: "Page",
      url: page.slug === "home" ? "/" : `/${page.slug}`,
      title: cleanSeoTitle(seoTitle || page.snapshot.meta.title),
      titleSource: seoTitle ? "seo_title" : "name/title (fallback)",
      description,
      descriptionSource: source,
    });
  }

  const products = must(
    await db.from("products").select("name, slug, summary, tagline, seo_title, seo_description, product_categories(slug)").eq("status", "published"),
    "products",
  ) as { name: string; slug: string; summary: string | null; tagline: string | null; seo_title: string | null; seo_description: string | null; product_categories: { slug: string } | null }[];
  for (const product of products) {
    const { description, source } = resolveDescription(product.seo_description, () => product.summary ?? product.tagline);
    const seoTitle = product.seo_title?.trim();
    rows.push({
      type: "Product",
      url: `/products/${product.product_categories?.slug ?? "?"}/${product.slug}`,
      title: cleanSeoTitle(seoTitle || product.name),
      titleSource: seoTitle ? "seo_title" : "name/title (fallback)",
      description,
      descriptionSource: source,
    });
  }

  const posts = must(await db.from("news_posts").select("title, slug, kind, excerpt, body").eq("status", "published"), "news_posts") as {
    title: string;
    slug: string;
    kind: string;
    excerpt: string | null;
    body: unknown;
  }[];
  for (const post of posts) {
    const { description, source } = resolveDescription(post.excerpt, () => richTextParagraphs(post.body).join(" "));
    rows.push({
      type: post.kind === "blog" ? "Blog post" : "News post",
      url: `/${post.kind === "blog" ? "blog" : "news"}/${post.slug}`,
      title: post.title,
      titleSource: "name/title (no SEO title field)",
      description,
      descriptionSource: source,
    });
  }

  for (const [table, type, base] of [
    ["industries", "Industry", "industries"],
    ["applications", "Application", "applications"],
  ] as const) {
    const items = must(await db.from(table).select("name, slug, description").eq("status", "published"), table) as {
      name: string;
      slug: string;
      description: string | null;
    }[];
    for (const item of items) {
      const { description, source } = resolveDescription(item.description, () => null);
      rows.push({ type, url: `/${base}/${item.slug}`, title: item.name, titleSource: "name/title (no SEO title field)", description, descriptionSource: source });
    }
  }

  return rows;
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

async function main() {
  const rows = await collect();
  const fallbacks = rows.filter((r) => r.titleSource === "name/title (fallback)" || r.descriptionSource !== "seo_description");

  const header = ["Type", "URL", "Title in use", "Title source", "Description in use", "Description source", "OSI to provide"];
  const lines = fallbacks.map((r) => {
    const needs = [r.titleSource === "name/title (fallback)" ? "SEO title" : null, r.descriptionSource !== "seo_description" ? "SEO description (max 160 chars)" : null]
      .filter(Boolean)
      .join(" + ");
    return [r.type, r.url, r.title, r.titleSource, r.description, r.descriptionSource, needs];
  });
  writeFileSync("docs/seo-fallbacks.csv", [header, ...lines].map((cells) => cells.map(csvCell).join(",")).join("\n") + "\n");

  console.log(`Published items: ${rows.length}. Using a fallback title or description: ${fallbacks.length}.`);
  console.log(`\n| ${header.join(" | ")} |\n|${header.map(() => "---").join("|")}|`);
  for (const line of lines) console.log(`| ${line.map((c) => c.replace(/\|/g, "\\|")).join(" | ")} |`);
  console.log("\nWrote docs/seo-fallbacks.csv");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
