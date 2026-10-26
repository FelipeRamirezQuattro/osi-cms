/**
 * Pure planning for the product-layout re-import (no I/O): decides, per
 * product, which fields the importer still owns (unchanged since it last
 * wrote them) and which a person has edited, and renders the migration SQL
 * with compare-and-set guards. Nothing here writes to a database — the SQL
 * is a file for a person to review and apply.
 */
import type { Json } from "./map";
import type { LayoutSeed, MappedProductLayout } from "./map-layout";
import { isLinkedSectionType } from "../products/layout";

export interface DbProduct {
  id: string;
  slug: string;
  status: string;
  updated_at: string;
  summary: string | null;
  diagram_image_url: string | null;
  video_url: string | null;
  brochure_pdf_url: string | null;
  model_3d_url: string | null;
  benefits: { title: string; updated_at?: string }[];
  blocks: { type: string; is_visible: boolean; data: Json; updated_at: string }[];
  specsCount: number;
  benefitsStamp: { count: number; max: string | null };
  blocksStamp: { count: number; max: string | null };
}

/** What the previous import wrote for the product (content/legacy/pages-batch2/_last-run.json), if it did. */
export interface PreviousImport {
  summary: string | null;
  diagramImageUrl: string | null;
  videoUrl: string | null;
  brochurePdfUrl: string | null;
  model3dUrl: string | null;
  benefits: { title: string }[];
  blocks: { type: string; data: Json }[];
}

type ScalarField = "summary" | "diagram_image_url" | "video_url" | "brochure_pdf_url" | "model_3d_url";
const FIELD_MAP: [ScalarField, keyof PreviousImport, keyof MappedProductLayout][] = [
  ["summary", "summary", "summary"],
  ["diagram_image_url", "diagramImageUrl", "diagramImageUrl"],
  ["video_url", "videoUrl", "videoUrl"],
  ["brochure_pdf_url", "brochurePdfUrl", "brochurePdfUrl"],
  ["model_3d_url", "model3dUrl", "model3dUrl"],
];

const squash = (v: string) => v.replace(/\s+/g, "");
const blank = (v: string | null | undefined) => (v ?? "").trim() === "";
const same = (a: string | null | undefined, b: string | null | undefined) => (a ?? "").trim() === (b ?? "").trim();
const stable = (v: unknown): string => JSON.stringify(v, (_k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x));

export interface FieldChange {
  field: string;
  from: string | null;
  to: string | null;
}

export interface ProductPlan {
  slug: string;
  status: string;
  /** "apply" writes something; "unchanged" has nothing to do; "skip" is blocked (reason). */
  action: "apply" | "unchanged" | "skip";
  reason?: string;
  fieldChanges: FieldChange[];
  /** Fields where the DB value differs from what the importer wrote, so it is left alone. */
  keptHumanEdits: { field: string; db: string | null; scrape: string | null }[];
  benefitsChange: { from: string[]; to: string[]; rows: { title: string; body?: string }[] } | null;
  /** Specification rows to add (only when the product has none). */
  specsAdd: { label: string; value: string; unit?: string }[];
  layoutApplied: boolean;
  layoutNote?: string;
  /** Layout to write (importer-owned products only). */
  layout: LayoutSeed[];
}

/** QA marked these "Complete" (Oct 21–24): they are not touched. */
export const QA_COMPLETE = new Set(["gas-vent-tac", "vortex-desander"]);

export function planProduct(m: MappedProductLayout, db: DbProduct, prev: PreviousImport | null): ProductPlan {
  const plan: ProductPlan = { slug: m.slug, status: db.status, action: "unchanged", fieldChanges: [], keptHumanEdits: [], benefitsChange: null, specsAdd: [], layoutApplied: false, layout: [] };
  if (QA_COMPLETE.has(m.slug)) return { ...plan, action: "skip", reason: "QA marked this product complete — left as is" };

  // Scalars: the importer owns a field when the DB still holds what it wrote (or nothing at all).
  for (const [dbField, prevField, newField] of FIELD_MAP) {
    const dbValue = db[dbField];
    const target = (m[newField] as string | null) ?? null;
    // Same words with different paragraph breaks (QA: "intro not split into paragraphs") is a formatting fix, not a human edit.
    const sameWords = dbField === "summary" && !blank(dbValue) && squash(dbValue!) === squash(target ?? "");
    const owned = blank(dbValue) || sameWords || (prev ? same(dbValue, prev[prevField] as string | null) : false);
    if (same(dbValue, target)) continue;
    if (blank(target)) continue; // never blank out a value
    if (owned) plan.fieldChanges.push({ field: dbField, from: dbValue, to: target });
    else plan.keptHumanEdits.push({ field: dbField, db: dbValue, scrape: target });
  }

  // Benefits.
  const dbTitles = db.benefits.map((b) => b.title);
  const newTitles = m.benefits.map((b) => b.title);
  if (stable(dbTitles) !== stable(newTitles) && newTitles.length > 0) {
    const owned = dbTitles.length === 0 || (prev ? stable(prev.benefits.map((b) => b.title)) === stable(dbTitles) : false);
    if (owned) plan.benefitsChange = { from: dbTitles, to: newTitles, rows: m.benefits };
    else plan.keptHumanEdits.push({ field: "benefits", db: dbTitles.join(" | "), scrape: newTitles.join(" | ") });
  }

  if (m.specs.length > 0 && db.specsCount === 0) plan.specsAdd = m.specs;

  // Layout.
  const hasLinked = db.blocks.some((b) => isLinkedSectionType(b.type));
  const dbBlocks = db.blocks.map((b) => ({ type: b.type, data: b.data }));
  if (hasLinked) {
    plan.layoutNote = "already has an ordered layout — left alone";
  } else if (db.blocks.length === 0 || (prev && stable(prev.blocks) === stable(dbBlocks))) {
    plan.layoutApplied = true;
    plan.layout = m.layout;
  } else {
    plan.layoutNote = "extra blocks were edited by a person after the import — layout not applied";
  }

  const writes = plan.fieldChanges.length > 0 || plan.benefitsChange !== null || plan.layoutApplied || plan.specsAdd.length > 0;
  plan.action = writes ? "apply" : "unchanged";
  return plan;
}

export const BACKUP_TABLE = "product_layout_backup_20261025";

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const qn = (s: string | null) => (s === null ? "null" : q(s));

/** One guarded DO block per product: skips itself (with a notice) if anything changed since the dry-run. */
export function productSql(plan: ProductPlan, db: DbProduct, m: MappedProductLayout): string {
  const lines: string[] = [];
  lines.push(`-- ${plan.slug} (${plan.status})`);
  lines.push("do $mig$");
  lines.push("declare pid uuid;");
  lines.push("begin");
  lines.push(`  select id into pid from products where slug = ${q(plan.slug)} and locale = 'en' and updated_at = ${q(db.updated_at)}::timestamptz;`);
  lines.push(`  if pid is null then raise notice 'skipped ${plan.slug}: the product changed since the dry-run'; return; end if;`);
  const stamp = (table: string, s: { count: number; max: string | null }) =>
    `(select count(*) = ${s.count} and coalesce(max(updated_at) = ${s.max ? `${q(s.max)}::timestamptz` : "null"}, ${s.max === null}) from ${table} where product_id = pid)`;
  if (plan.benefitsChange) lines.push(`  if not ${stamp("product_benefits", db.benefitsStamp)} then raise notice 'skipped ${plan.slug}: benefits changed since the dry-run'; return; end if;`);
  if (plan.layoutApplied) lines.push(`  if not ${stamp("product_blocks", db.blocksStamp)} then raise notice 'skipped ${plan.slug}: blocks changed since the dry-run'; return; end if;`);

  // Everything this block is about to change or delete is copied to the backup table first.
  const backup = (table: string, from: string) =>
    lines.push(`  insert into ${BACKUP_TABLE} (product_id, table_name, row_data) select pid, '${table}', to_jsonb(t) from ${from} t;`);
  if (plan.fieldChanges.length) backup("products", "(select * from products where id = pid)");
  if (plan.benefitsChange) backup("product_benefits", "(select * from product_benefits where product_id = pid)");
  if (plan.layoutApplied) backup("product_blocks", "(select * from product_blocks where product_id = pid)");

  if (plan.specsAdd.length) {
    lines.push("  if (exists (select 1 from product_specs where product_id = pid)) then raise notice 'specs of " + plan.slug + " already exist — not added'; else");
    lines.push(
      `    insert into product_specs (product_id, label, value, unit, position) values ${plan.specsAdd.map((r, i) => `(pid, ${q(r.label)}, ${q(r.value)}, ${qn(r.unit ?? null)}, ${(i + 1) * 10})`).join(", ")};`,
    );
    lines.push("  end if;");
  }
  if (plan.fieldChanges.length) {
    lines.push(`  update products set ${plan.fieldChanges.map((c) => `${c.field} = ${qn(c.to)}`).join(", ")} where id = pid;`);
  }
  if (plan.benefitsChange) {
    lines.push("  delete from product_benefits where product_id = pid;");
    lines.push(
      `  insert into product_benefits (product_id, title, body, position) values ${plan.benefitsChange.rows.map((r, i) => `(pid, ${q(r.title)}, ${qn(r.body ?? null)}, ${(i + 1) * 10})`).join(", ")};`,
    );
  }
  if (plan.layoutApplied) {
    lines.push("  delete from product_blocks where product_id = pid;");
    lines.push(
      `  insert into product_blocks (product_id, type, position, is_visible, data) values\n${plan.layout
        .map((b, i) => `    (pid, ${q(b.type)}, ${(i + 1) * 10}, ${b.is_visible}, $json$${JSON.stringify(b.data)}$json$::jsonb)`)
        .join(",\n")};`,
    );
    if (m.imageAlts.length) {
      lines.push(
        `  insert into media_assets (url, alt, source) values ${m.imageAlts.map((a) => `(${q(a.url)}, ${q(a.alt)}, 'legacy')`).join(", ")} on conflict (url) do nothing;`,
      );
    }
  }
  lines.push("end");
  lines.push("$mig$;");
  return lines.join("\n");
}

/** Header of the migration file: the backup table and how to restore one product from it. */
export function migrationHeader(tag: string): string {
  return `-- 0057: product page layouts (${tag}). GENERATED by scripts/plan-product-layouts.ts --emit-migration.
--
-- What it does, per product, only while the product still looks exactly as the dry-run saw it
-- (updated_at plus the benefits/blocks row count and newest updated_at; otherwise that product is
-- skipped with a notice):
--   * writes the ordered page layout (product_blocks) and the importer-owned fields the dry-run listed;
--   * deletes ONLY that product's importer-owned product_blocks (and product_benefits when they change)
--     — each row is copied into ${BACKUP_TABLE} first;
--   * never touches a published product, a product's category, or its status.
--
-- Before applying: run \`pnpm backup:export\`, then re-run the planner against the live database
--   pnpm exec tsx --env-file=.env.local scripts/plan-product-layouts.ts --emit-migration
-- and make sure \`git diff supabase/migrations/0057_product_layouts_drafts.sql\` is empty (or review it).
--
-- Restore one product (replace the slug):
--   do $restore$
--   declare pid uuid := (select id from products where slug = 'SLUG' and locale = 'en');
--   begin
--     delete from product_blocks where product_id = pid;
--     insert into product_blocks select * from jsonb_populate_recordset(null::product_blocks,
--       (select coalesce(jsonb_agg(row_data), '[]') from ${BACKUP_TABLE} where product_id = pid and table_name = 'product_blocks'));
--     if exists (select 1 from ${BACKUP_TABLE} where product_id = pid and table_name = 'product_benefits') then
--       delete from product_benefits where product_id = pid;
--       insert into product_benefits select * from jsonb_populate_recordset(null::product_benefits,
--         (select jsonb_agg(row_data) from ${BACKUP_TABLE} where product_id = pid and table_name = 'product_benefits'));
--     end if;
--     update products set summary = r.summary, diagram_image_url = r.diagram_image_url, video_url = r.video_url,
--       brochure_pdf_url = r.brochure_pdf_url, model_3d_url = r.model_3d_url
--     from jsonb_populate_record(null::products, (select row_data from ${BACKUP_TABLE}
--       where product_id = pid and table_name = 'products' order by id limit 1)) r where products.id = pid
--       and exists (select 1 from ${BACKUP_TABLE} where product_id = pid and table_name = 'products');
--   end $restore$;
-- (Specification rows the migration added to a product that had none are not in the backup; delete them
--  with: delete from product_specs where product_id = pid — only for a product that had no specs before.)

create table if not exists ${BACKUP_TABLE} (
  id bigint generated always as identity primary key,
  product_id uuid not null,
  table_name text not null,
  row_data jsonb not null,
  deleted_at timestamptz not null default now()
);
create index if not exists ${BACKUP_TABLE}_product_idx on ${BACKUP_TABLE} (product_id, table_name);
alter table ${BACKUP_TABLE} enable row level security;
create policy "staff read ${BACKUP_TABLE}" on ${BACKUP_TABLE} for select using (public.is_staff());

`;
}
