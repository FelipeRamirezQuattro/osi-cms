-- Task 15: defense-in-depth against a self-looping redirect at the DB
-- level, mirroring the existing product_related precedent
-- (`check (product_id <> related_product_id)`, migration 0003) — the
-- app-level check (lib/validation/redirects.ts, wired into
-- lib/actions/entities.ts's saveEntityAction for the `redirects` entity)
-- is the primary, user-facing guard with a friendly message; this
-- constraint is the backstop against any write path that skips it
-- (a future script, a direct REST call, etc.).
--
-- Multi-hop chain/loop rejection (beyond this one-step case) is
-- necessarily app-level only — a CHECK constraint can't see other rows —
-- see lib/validation/redirects.ts's findRedirectChainIssue.
alter table redirects add constraint redirects_no_self_loop_check
  check (from_path <> to_path);
