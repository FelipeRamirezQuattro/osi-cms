/**
 * Batch-2 legacy import (content/legacy/pages-batch2/*.json → drafts).
 *
 * Rules (see docs/DECISIONS.md, "Batch 2"):
 *  - everything lands status='draft'; nothing is ever deleted;
 *  - an existing row is never modified unless batch 2 created it, it is
 *    still a draft, and nobody has edited it since (tracked in
 *    _import-state.json — there is no legacy_path column);
 *  - idempotent: payload hash unchanged → 0 writes.
 *
 * Usage:
 *   pnpm migrate:batch2 --dry-run   plan only; writes _dry-run.json, no DB writes
 *   pnpm migrate:batch2             apply
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createServiceRoleDbClient } from "../lib/db/client";
import { getBlockDefinition } from "../lib/blocks/registry";
import {
  LEGACY_ENTRIES,
  LEGACY_PDFS,
  LEGACY_BASE,
  type LegacyEntry,
} from "../lib/legacy/batch2-manifest";
import {
  findChromeImages,
  mapBlogPost,
  mapPage,
  mapProduct,
  matchExistingProduct,
  pageText,
  textSimilarity,
  type MapContext,
  type ScrapedPage,
} from "../lib/legacy/map";

const DRY_RUN = process.argv.includes("--dry-run");
const DIR = path.join(import.meta.dirname, "..", "content", "legacy", "pages-batch2");
const STATE_FILE = path.join(DIR, "_import-state.json");
const DUP_THRESHOLD = 0.8;

type Table = "products" | "pages" | "news_posts" | "resources";
interface StateRow {
  id: string;
  hash: string;
  updated_at: string;
}
type State = Record<string, Record<string, StateRow>>;

type Action = "create" | "update" | "unchanged" | "skip_exists" | "skip_edited" | "skip_not_draft" | "merged" | "not_scraped";
interface PlanRow {
  id: string;
  path: string;
  table: Table;
  slug: string;
  action: Action;
  flags: string[];
  note?: string;
  payload?: unknown;
}

const hash = (v: unknown) => crypto.createHash("sha1").update(JSON.stringify(v)).digest("hex");
const loadState = (): State => (fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, "utf-8")) : {});

function loadScraped(entry: LegacyEntry): ScrapedPage | null {
  const f = path.join(DIR, `${entry.id}.json`);
  return fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, "utf-8")) as ScrapedPage) : null;
}

function validateBlocks(blocks: { type: string; data: Record<string, unknown> }[]): string[] {
  const errors: string[] = [];
  for (const b of blocks) {
    const def = getBlockDefinition(b.type);
    if (!def) {
      errors.push(`${b.type}: unknown block`);
      continue;
    }
    const r = def.schema.safeParse(b.data);
    if (!r.success) errors.push(`${b.type}: ${r.error.issues.map((i) => i.message).join("; ")}`);
  }
  return errors;
}

async function main() {
  const db = createServiceRoleDbClient();
  const state = loadState();

  const scraped = new Map<string, ScrapedPage>();
  for (const e of LEGACY_ENTRIES) {
    const s = loadScraped(e);
    if (s) scraped.set(e.id, s);
  }
  const ctx: MapContext = { chromeImages: findChromeImages([...scraped.values()]) };

  const reads = await Promise.all([
    db.from("products").select("id,slug,name,status,updated_at"),
    db.from("pages").select("id,slug,status,updated_at"),
    db.from("news_posts").select("id,slug,status,updated_at"),
    db.from("resources").select("id,file_url"),
    db.from("product_categories").select("id,slug"),
  ]);
  // A failed read must abort: an empty result would silently disable the
  // existing-product match and slug-collision checks.
  for (const r of reads) if (r.error) throw r.error;
  const [{ data: products }, { data: pages }, { data: posts }, { data: resources }, { data: cats }] = reads;
  const catId = new Map((cats ?? []).map((c) => [c.slug, c.id]));
  const existing: Record<"products" | "pages" | "news_posts", Map<string, { id: string; status: string; updated_at: string }>> = {
    products: new Map((products ?? []).map((r) => [r.slug, r])),
    pages: new Map((pages ?? []).map((r) => [r.slug, r])),
    news_posts: new Map((posts ?? []).map((r) => [r.slug, r])),
  };

  // Rows batch 2 created itself must not count as "existing products" on re-runs.
  const preexisting = (products ?? []).filter((p) => state.products?.[p.slug]?.id !== p.id);

  const plan: PlanRow[] = [];
  const matches: { entry: string; name: string; match: string; confidence: string }[] = [];
  const duplicates: { duplicate: string; canonical: string; similarity: number; merged: boolean }[] = [];
  const merged = new Set<string>();
  const richer = new Map<string, ScrapedPage>(); // canonical id → page whose content wins

  // Duplicate detection first.
  for (const e of LEGACY_ENTRIES.filter((x) => x.duplicateOf)) {
    const canon = LEGACY_ENTRIES.find((x) => x.path === e.duplicateOf)!;
    const a = scraped.get(canon.id);
    const b = scraped.get(e.id);
    if (!a || !b) continue;
    const sim = textSimilarity(pageText(a), pageText(b));
    const isDup = sim >= DUP_THRESHOLD;
    duplicates.push({ duplicate: e.path, canonical: canon.path, similarity: Number(sim.toFixed(2)), merged: isDup });
    if (isDup) {
      merged.add(e.id);
      if (pageText(b).length > pageText(a).length * 1.15) richer.set(canon.id, b);
    }
  }

  const decide = (table: "products" | "pages" | "news_posts", slug: string, payloadHash: string): { action: Action; note?: string } => {
    const row = existing[table].get(slug);
    if (!row) return { action: "create" };
    const st = state[table]?.[slug];
    if (!st || st.id !== row.id) return { action: "skip_exists", note: `slug already used by an existing ${row.status} row` };
    if (row.status !== "draft") return { action: "skip_not_draft", note: `now ${row.status}` };
    if (row.updated_at !== st.updated_at) return { action: "skip_edited", note: "edited in admin since import" };
    return st.hash === payloadHash ? { action: "unchanged" } : { action: "update" };
  };

  for (const entry of LEGACY_ENTRIES) {
    if (!["product", "page", "blog"].includes(entry.target)) continue;
    const table: Table = entry.target === "product" ? "products" : entry.target === "page" ? "pages" : "news_posts";
    if (merged.has(entry.id)) {
      plan.push({ id: entry.id, path: entry.path, table, slug: entry.slug!, action: "merged", flags: [], note: `merged into ${entry.duplicateOf}` });
      continue;
    }
    const page = richer.get(entry.id) ?? scraped.get(entry.id);
    if (!page) {
      plan.push({ id: entry.id, path: entry.path, table, slug: entry.slug!, action: "not_scraped", flags: [], note: "no scrape output (see _failures.json)" });
      continue;
    }

    if (entry.target === "product") {
      const m = mapProduct(entry, page, ctx);
      const match = matchExistingProduct(m.name, m.slug, preexisting);
      matches.push({ entry: entry.id, name: m.name, match: match.slug ?? "—", confidence: match.confidence });
      const payload = { ...m, categoryId: m.categorySlug ? catId.get(m.categorySlug) ?? null : null };
      const h = hash(payload);
      const d = match.confidence === "none" ? decide("products", m.slug, h) : { action: "skip_exists" as Action, note: `matches existing product ${match.slug} (${match.confidence})` };
      plan.push({ id: entry.id, path: entry.path, table, slug: m.slug, action: d.action, note: d.note, flags: m.flags, payload });
    } else if (entry.target === "page") {
      const m = mapPage(entry, page, ctx);
      const errors = validateBlocks(m.blocks);
      const h = hash(m);
      const d = decide("pages", m.slug, h);
      plan.push({
        id: entry.id,
        path: entry.path,
        table,
        slug: m.slug,
        action: errors.length ? "not_scraped" : d.action,
        note: errors.length ? `BLOCK VALIDATION: ${errors.join(" | ")}` : d.note,
        flags: [...m.flags, ...(entry.needsOsiDecision ? ["needs_osi_decision"] : []), ...(entry.language ? ["language:es"] : []), ...(m.formFields.length ? [`form_fields:${m.formFields.join(",")}`] : [])],
        payload: m,
      });
    } else {
      const m = mapBlogPost(entry, page, ctx);
      const h = hash(m);
      const d = decide("news_posts", m.slug, h);
      plan.push({ id: entry.id, path: entry.path, table, slug: m.slug, action: d.action, note: d.note, flags: m.flags, payload: m });
    }
  }

  // PDFs → resources (the 4 from the Downloads menu).
  const haveFiles = new Set((resources ?? []).map((r) => r.file_url));
  for (const pdf of LEGACY_PDFS) {
    const url = `${LEGACY_BASE}${pdf.path}`;
    plan.push({
      id: pdf.id,
      path: pdf.path,
      table: "resources",
      slug: pdf.title,
      action: haveFiles.has(url) ? "unchanged" : "create",
      flags: pdf.kind === "manual" ? ["kind_manual_instead_of_other"] : [],
      payload: { title: pdf.title, kind: pdf.kind, file_url: url },
    });
  }

  // Per-page PDFs not in the Downloads menu (proposal; not written by default).
  const menuUrls = new Set(LEGACY_PDFS.map((p) => `${LEGACY_BASE}${p.path}`));
  const extraPdfs = new Map<string, { text: string; from: string[] }>();
  for (const e of LEGACY_ENTRIES) {
    for (const p of scraped.get(e.id)?.pdfs ?? []) {
      if (menuUrls.has(p.url)) continue;
      const cur = extraPdfs.get(p.url) ?? { text: p.text, from: [] };
      cur.from.push(e.id);
      extraPdfs.set(p.url, cur);
    }
  }

  // Per-page PDFs → draft resources (approved at Gate 2). Linked to a
  // product only when exactly one product page links the file.
  for (const [url, v] of extraPdfs) {
    const owners = [...new Set(v.from)].map((id) => LEGACY_ENTRIES.find((x) => x.id === id)!);
    const productOwners = owners.filter((o) => o.target === "product" && !merged.has(o.id));
    const title = v.text.trim() || `${owners[0].title} PDF`;
    plan.push({
      id: `PDF-${crypto.createHash("sha1").update(url).digest("hex").slice(0, 6)}`,
      path: url.replace(LEGACY_BASE, ""),
      table: "resources",
      slug: title,
      action: haveFiles.has(url) ? "unchanged" : "create",
      flags: [`linked_from:${owners.map((o) => o.id).join(",")}`],
      payload: { title, kind: "datasheet", file_url: url, productSlug: productOwners.length === 1 && owners.length === 1 ? productOwners[0].slug : null },
    });
  }

  const summary: Record<string, Record<string, number>> = {};
  for (const r of plan) {
    summary[r.table] ??= {};
    summary[r.table][r.action] = (summary[r.table][r.action] ?? 0) + 1;
  }

  const report = {
    generated_at: new Date().toISOString(),
    dry_run: DRY_RUN,
    chrome_images: [...ctx.chromeImages],
    summary,
    duplicates,
    product_matches: matches,
    extra_pdfs: [...extraPdfs].map(([url, v]) => ({ url, ...v })),
    plan,
  };
  fs.writeFileSync(path.join(DIR, DRY_RUN ? "_dry-run.json" : "_last-run.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ summary, duplicates, extra_pdfs: report.extra_pdfs.length }, null, 2));

  if (DRY_RUN) return;
  await apply(db, plan, state);
}

async function apply(
  db: ReturnType<typeof createServiceRoleDbClient>,
  plan: PlanRow[],
  state: State,
) {
  const writable = plan.filter((p) => p.action === "create" || p.action === "update");
  for (const row of writable) {
    state[row.table] ??= {};
    if (row.table === "products") {
      const m = row.payload as ReturnType<typeof mapProduct> & { categoryId: string | null };
      const { data, error } = await db
        .from("products")
        .upsert(
          {
            slug: m.slug,
            locale: "en",
            name: m.name,
            category_id: m.categoryId,
            summary: m.summary,
            diagram_image_url: m.diagramImageUrl,
            video_url: m.videoUrl,
            brochure_pdf_url: m.brochurePdfUrl,
            seo_title: m.seoTitle,
            seo_description: m.seoDescription,
            status: "draft",
          },
          { onConflict: "slug,locale" },
        )
        .select("id,updated_at")
        .single();
      if (error) throw error;
      await db.from("product_benefits").delete().eq("product_id", data.id);
      await db.from("product_specs").delete().eq("product_id", data.id);
      if (m.benefits.length) {
        const { error: e } = await db.from("product_benefits").insert(m.benefits.map((b, i) => ({ product_id: data.id, title: b.title, position: (i + 1) * 10 })));
        if (e) throw e;
      }
      if (m.specs.length) {
        const { error: e } = await db.from("product_specs").insert(m.specs.map((s, i) => ({ product_id: data.id, label: s.label, value: s.value, unit: s.unit ?? null, position: (i + 1) * 10 })));
        if (e) throw e;
      }
      for (const img of m.imageAlts) {
        await db.from("media_assets").upsert({ url: img.url, alt: img.alt, source: "legacy" }, { onConflict: "url", ignoreDuplicates: true });
      }
      state.products[m.slug] = { id: data.id, hash: hash(row.payload), updated_at: await refreshUpdatedAt(db, "products", data.id) };
    } else if (row.table === "pages") {
      const m = row.payload as ReturnType<typeof mapPage>;
      const { data, error } = await db
        .from("pages")
        .upsert(
          { slug: m.slug, locale: "en", title: m.title, template: m.template, seo_title: m.seoTitle, seo_description: m.seoDescription ?? undefined, status: "draft" },
          { onConflict: "slug,locale" },
        )
        .select("id")
        .single();
      if (error) throw error;
      await db.from("page_blocks").delete().eq("page_id", data.id);
      let position = 0;
      for (const b of m.blocks) {
        position += 10;
        const { error: e } = await db.from("page_blocks").insert({ page_id: data.id, type: b.type, position, data: b.data as never });
        if (e) throw e;
      }
      state.pages[m.slug] = { id: data.id, hash: hash(m), updated_at: await refreshUpdatedAt(db, "pages", data.id) };
    } else if (row.table === "news_posts") {
      const m = row.payload as ReturnType<typeof mapBlogPost>;
      const { data, error } = await db
        .from("news_posts")
        .upsert(
          { slug: m.slug, locale: "en", title: m.title, kind: "blog", excerpt: m.excerpt, body: m.body as never, cover_image_url: m.coverImageUrl, published_at: m.publishedAt, status: "draft" },
          { onConflict: "slug,locale" },
        )
        .select("id")
        .single();
      if (error) throw error;
      state.news_posts[m.slug] = { id: data.id, hash: hash(m), updated_at: await refreshUpdatedAt(db, "news_posts", data.id) };
    } else {
      const { productSlug, ...p } = row.payload as { title: string; kind: "brochure" | "datasheet" | "manual"; file_url: string; productSlug?: string | null };
      const productId = productSlug ? state.products?.[productSlug]?.id ?? null : null;
      const { data, error } = await db.from("resources").insert({ ...p, product_id: productId, status: "draft" }).select("id,updated_at").single();
      if (error) throw error;
      state.resources[p.file_url] = { id: data.id, hash: hash(p), updated_at: data.updated_at };
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    console.log(`${row.action} ${row.table}/${row.slug}`);
  }
}

async function refreshUpdatedAt(db: ReturnType<typeof createServiceRoleDbClient>, table: "products" | "pages" | "news_posts", id: string) {
  const { data, error } = await db.from(table).select("updated_at").eq("id", id).single();
  if (error) throw error;
  return data.updated_at;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
