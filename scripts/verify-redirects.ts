/**
 * Launch check: fetches every legacy path in the live `redirects` table from
 * ANY base URL, WITHOUT following redirects, and reports the status and
 * Location each one answers with. Read-only (GETs, plus one GET per
 * destination for the "is it a real page" check).
 *
 * Run:  pnpm verify:redirects                         # http://localhost:3000
 *       pnpm verify:redirects https://odessaseparator.com
 *       pnpm verify:redirects https://osi-cms.vercel.app --no-destination-check
 *       pnpm verify:redirects https://odessaseparator.com --csv=/tmp/redirects.csv
 *
 * Exit code 0 = every path matched; 1 = at least one mismatch (details below
 * the table); 2 = could not read the table / bad arguments.
 *
 * What "matched" means: the status equals the stored status_code and the
 * Location equals what the redirect resolves to today (a published product's
 * URL, a draft product's category list, a page's path or its fallback — the
 * same rules proxy.ts applies, via lib/redirects/resolver). Location is
 * compared as a path on the SAME host: after go-live, osi-cms.vercel.app
 * itself 301s to odessaseparator.com, and a Location on that other host is
 * reported as a mismatch for that base on purpose — run the check against
 * the final domain.
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (from
 * .env.local via `pnpm verify:redirects`).
 */
import { writeFileSync } from "node:fs";
import { resolveRedirectTarget, type RedirectIndexRow } from "../lib/redirects/resolver";

export type Observed = { status: number; location: string | null; error?: string };
export type Verdict = {
  from: string;
  expectedStatus: number;
  expectedTo: string;
  status: number | null;
  location: string | null;
  result: "ok" | "page-wins" | "mismatch" | "error";
  note: string;
};

/** Location as "/path?query" when it is on `base`'s host (or relative); otherwise the full URL. */
export function locationOnHost(location: string | null, base: string): string | null {
  if (!location) return null;
  const url = new URL(location, base);
  return url.host === new URL(base).host ? url.pathname + url.search : url.toString();
}

export function judge(row: RedirectIndexRow, observed: Observed, base: string): Verdict {
  const expectedTo = resolveRedirectTarget(row);
  const location = locationOnHost(observed.location, base);
  const verdict = { from: row.from_path, expectedStatus: row.status_code, expectedTo, status: observed.status || null, location };
  if (observed.error) return { ...verdict, result: "error", note: observed.error };
  // A published CMS page at the same path legitimately wins over its redirect row (proxy.ts).
  if (observed.status === 200) return { ...verdict, result: "page-wins", note: "a published page lives at this path; the redirect row is shadowed" };
  if (observed.status === row.status_code && location === expectedTo) return { ...verdict, result: "ok", note: "" };
  return {
    ...verdict,
    result: "mismatch",
    note: `got ${observed.status} -> ${location ?? "(no Location)"}, expected ${row.status_code} -> ${expectedTo}`,
  };
}

async function readTable(): Promise<RedirectIndexRow[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set (use `pnpm verify:redirects`, which loads .env.local).");
  const res = await fetch(`${url}/rest/v1/rpc/redirect_index`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) throw new Error(`redirect_index() answered ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as RedirectIndexRow[];
}

async function observe(base: string, path: string): Promise<Observed> {
  try {
    const res = await fetch(new URL(path, base), { redirect: "manual", signal: AbortSignal.timeout(20_000), headers: { "user-agent": "osi-verify-redirects/1.0" } });
    return { status: res.status, location: res.headers.get("location") };
  } catch (error) {
    return { status: 0, location: null, error: error instanceof Error ? `${error.name}: ${error.message}` : String(error) };
  }
}

/** The destination must be a real page: 200 and a page-specific <title> (an unresolved route renders the bare default title). */
async function destinationProblem(base: string, to: string): Promise<string | null> {
  try {
    const res = await fetch(new URL(to, base), { redirect: "follow", signal: AbortSignal.timeout(20_000), headers: { "user-agent": "osi-verify-redirects/1.0" } });
    const title = /<title[^>]*>([^<]*)<\/title>/.exec(await res.text())?.[1]?.trim() ?? "";
    if (res.status !== 200) return `destination ${to} answers ${res.status}`;
    if (to !== "/" && title === "Odessa Separator Inc.") return `destination ${to} renders the default title (probable 404)`;
    return null;
  } catch (error) {
    return `destination ${to}: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        out[index] = await fn(items[index]);
      }
    }),
  );
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const base = (args.find((a) => !a.startsWith("--")) ?? "http://localhost:3000").replace(/\/$/, "");
  const checkDestination = !args.includes("--no-destination-check");
  const csvPath = args.find((a) => a.startsWith("--csv="))?.slice("--csv=".length);
  try {
    new URL(base);
  } catch {
    console.error(`Not a valid base URL: ${base}`);
    process.exit(2);
  }

  let rows: RedirectIndexRow[];
  try {
    rows = await readTable();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(2);
  }

  console.log(`Base: ${base}\nLegacy redirect rows in the table: ${rows.length}\n`);
  const started = Date.now();
  const verdicts = await mapLimit(rows, 6, async (row) => {
    const verdict = judge(row, await observe(base, row.from_path), base);
    if (checkDestination && verdict.result === "ok") {
      const problem = await destinationProblem(base, verdict.expectedTo);
      if (problem) return { ...verdict, result: "mismatch" as const, note: problem };
    }
    return verdict;
  });

  const pad = (text: string, width: number) => (text.length > width ? `${text.slice(0, width - 1)}…` : text.padEnd(width));
  console.log(`${pad("RESULT", 10)}${pad("FROM", 38)}${pad("STATUS", 8)}LOCATION`);
  for (const v of verdicts) console.log(`${pad(v.result.toUpperCase(), 10)}${pad(v.from, 38)}${pad(String(v.status ?? "-"), 8)}${v.location ?? ""}`);

  const count = (result: Verdict["result"]) => verdicts.filter((v) => v.result === result).length;
  console.log(`\n${verdicts.length} paths in ${((Date.now() - started) / 1000).toFixed(1)}s — ok ${count("ok")}, page-wins ${count("page-wins")}, mismatch ${count("mismatch")}, error ${count("error")}`);
  const bad = verdicts.filter((v) => v.result === "mismatch" || v.result === "error");
  if (bad.length > 0) {
    console.log("\nProblems:");
    for (const v of bad) console.log(`  ${v.from}: ${v.note}`);
  }

  if (csvPath) {
    const cell = (value: string | number | null) => (/[",\n]/.test(String(value ?? "")) ? `"${String(value).replace(/"/g, '""')}"` : String(value ?? ""));
    const lines = [["from", "expected_status", "expected_location", "status", "location", "result", "note"], ...verdicts.map((v) => [v.from, v.expectedStatus, v.expectedTo, v.status, v.location, v.result, v.note])];
    writeFileSync(csvPath, lines.map((line) => line.map(cell).join(",")).join("\n") + "\n");
    console.log(`\nWrote ${csvPath}`);
  }
  process.exit(bad.length > 0 ? 1 : 0);
}

// Only run when executed directly, so the unit test can import judge()/locationOnHost().
if (process.argv[1] && /verify-redirects\.ts$/.test(process.argv[1])) void main();
