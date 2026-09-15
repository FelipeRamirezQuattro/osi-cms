# CMS remediation revalidation — 2026-09-15

## Outcome

The three findings from the previous validation are closed in commit `3ff3b9d`:

- The public navigation no longer links to the missing `/esp-packages` route.
- `/locations` resolves successfully and the old `href="#"` brochure placeholder is gone.
- The content-integrity command authenticates successfully and now includes navigation links in its scan.

Task 16 of the remediation plan remains intentionally skipped because the user guide is not required yet.

## Remaining items

These items do not block the admin UI redesign, but they should remain visible as follow-up work:

1. `pnpm report:content-integrity` reports 20 broken internal links that are currently false positives. The four product-category URLs and sixteen product URLs reported by the command were checked against production and returned HTTP 200. The report's known-route construction should eventually be aligned with the public route resolver.
2. The report identifies 8 legacy media records without alternative text. This is a content cleanup task rather than a missing CMS capability.
3. The report identifies 24 orphaned media records. These should be reviewed before deletion because orphan status alone does not prove that a file is safe to remove.
4. Supabase automated backups and point-in-time recovery are still unavailable on the current Free plan, as recorded in `docs/BACKUP-RESTORE.md`. This requires an operational decision, not an application-code change.

## Redesign gate

The remediation implementation is stable enough to begin `2026-09-14-admin-ui-motion-redesign.md`. The first redesign slice should preserve the existing admin behavior and capability filtering while replacing the inherited public-site typography, colors, spacing, and motion at the shared shell/primitive level.
