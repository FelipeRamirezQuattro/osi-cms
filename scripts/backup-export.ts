/**
 * Manual logical backup of every public table — the stop-gap docs/BACKUP-RESTORE.md
 * describes while the Supabase project is on the Free plan (no automated
 * backups, no point-in-time recovery). Read-only: SELECTs through the
 * service-role API; nothing is written to the database.
 *
 * Run:  pnpm backup:export [outDir]        # default: ./backups/<UTC timestamp>
 *
 * Writes into outDir:
 *   data/<table>.json   one file per table, all rows
 *   restore.sql         loads those rows into a database that already has the
 *                       schema (migrations 0001-0053, see BACKUP-RESTORE.md)
 *   manifest.json       table -> row count, and the time the export ran
 *
 * NOT included — a restore needs these separately:
 *   - Auth users (admin accounts, password hashes): the API does not expose
 *     the auth schema. After a full loss, re-invite admins (pnpm create-admin).
 *   - Storage files (the `media` bucket): only their URLs are in media_assets.
 *
 * Contains personal data (form submissions, subscribers): keep it private.
 * `backups/` is git-ignored.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set (use `pnpm backup:export`, which loads .env.local).");
  process.exit(2);
}

const PAGE = 1000;
// Supabase also refuses a secret key from a request that looks like a browser, hence the explicit User-Agent.
const headers: Record<string, string> = { apikey: key, "user-agent": "osi-backup-export/1.0", ...(key.startsWith("sb_") ? {} : { Authorization: `Bearer ${key}` }) };

/** Table names come from PostgREST's own OpenAPI document, so a new table is never silently skipped. */
async function listTables(): Promise<string[]> {
  const res = await fetch(`${url}/rest/v1/`, { headers: { ...headers, Accept: "application/openapi+json" } });
  if (!res.ok) throw new Error(`Could not list tables: ${res.status} ${(await res.text()).slice(0, 200)}`);
  const spec = (await res.json()) as { paths: Record<string, unknown> };
  return Object.keys(spec.paths)
    .filter((p) => /^\/[a-z_0-9]+$/.test(p))
    .map((p) => p.slice(1))
    .sort();
}

async function fetchAll(table: string): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += PAGE) {
    const res = await fetch(`${url}/rest/v1/${table}?select=*`, { headers: { ...headers, Range: `${from}-${from + PAGE - 1}`, "Range-Unit": "items" } });
    if (!res.ok) throw new Error(`${table}: ${res.status} ${(await res.text()).slice(0, 200)}`);
    const page = (await res.json()) as Record<string, unknown>[];
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

/** A SQL string literal that is safe for any content (standard_conforming_strings is on by default). */
const literal = (text: string) => `'${text.replace(/'/g, "''")}'`;

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = process.argv[2] ?? path.join("backups", stamp);
  mkdirSync(path.join(outDir, "data"), { recursive: true });

  const started = Date.now();
  const tables = await listTables();
  const counts: Record<string, number> = {};
  const inserts: string[] = [];
  for (const table of tables) {
    const rows = await fetchAll(table);
    counts[table] = rows.length;
    const json = JSON.stringify(rows);
    writeFileSync(path.join(outDir, "data", `${table}.json`), json);
    if (rows.length === 0) continue;
    // Column list is read from the target at restore time and skips generated columns (search_vector).
    inserts.push(
      `do $restore$ declare cols text; begin\n` +
        `  select string_agg(format('%I', column_name), ', ' order by ordinal_position) into cols from information_schema.columns where table_schema = 'public' and table_name = ${literal(table)} and is_generated = 'NEVER';\n` +
        `  execute format('insert into public.%I (%s) select %s from jsonb_populate_recordset(null::public.%I, %L::jsonb)', ${literal(table)}, cols, cols, ${literal(table)}, ${literal(json)});\n` +
        `end $restore$;`,
    );
  }

  const restore = [
    `-- Restore of ${tables.length} tables exported ${new Date().toISOString()}. Run with psql against a database that already has the schema.`,
    `set session_replication_role = replica; -- skip triggers and foreign-key checks while loading`,
    `begin;`,
    // One TRUNCATE for every table: a per-table CASCADE would wipe children loaded earlier.
    `truncate table ${tables.map((t) => `public.${t}`).join(", ")};`,
    ...inserts,
    `commit;`,
    ``,
  ].join("\n");
  writeFileSync(path.join(outDir, "restore.sql"), restore);
  writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify({ exportedAt: new Date().toISOString(), tables: counts }, null, 2));

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`Exported ${tables.length} tables, ${total} rows in ${((Date.now() - started) / 1000).toFixed(1)}s -> ${outDir}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
