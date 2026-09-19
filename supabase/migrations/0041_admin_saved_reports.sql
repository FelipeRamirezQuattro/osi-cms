-- Phase 8c: per-admin-user "saved reports" star/bookmark (Wix's quick-
-- access icon). Per-user data, not public/staff-split content, so a
-- single `for all` policy covers every command — no "multiple permissive
-- policies" question here.
create table admin_saved_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  report_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, report_key)
);

alter table admin_saved_reports enable row level security;

create policy "staff manage their own saved reports"
  on admin_saved_reports for all
  using (user_id = auth.uid() and public.is_staff())
  with check (user_id = auth.uid() and public.is_staff());
