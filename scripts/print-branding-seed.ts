/**
 * Prints `OSI_SEED_BRANDING_CONFIG` (lib/branding/seed.ts) as a single
 * line of JSON, for pasting into a `supabase/migrations/*.sql` file's
 * dollar-quoted jsonb literal — this is how 0032_site_branding.sql's
 * (and any later migration's) seed/data-correction jsonb was produced,
 * so the TypeScript constant and the SQL literal never hand-drift from
 * each other. `lib/branding/schema.test.ts` separately asserts the TS
 * constant itself parses against `brandingConfigV1Schema`.
 *
 * This script does no DB I/O (no createServerDbClient/createServiceRoleDbClient
 * needed — it only imports a plain TS module), so it runs with a plain
 * `tsx`, no `--env-file` required:
 *
 *   pnpm exec tsx scripts/print-branding-seed.ts
 */
import { OSI_SEED_BRANDING_CONFIG } from "../lib/branding/seed";

process.stdout.write(JSON.stringify(OSI_SEED_BRANDING_CONFIG));
