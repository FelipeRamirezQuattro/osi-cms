-- Dev outbox for EMAIL_DRY_RUN=true: every message the site would have sent is
-- stored here instead, and shown to admins at /admin/email-outbox. Rows are
-- written by server code with the service-role client (visitors trigger the
-- sends, so there is deliberately no anon/authenticated INSERT policy); only
-- admins can read or purge them. Plain portable SQL.

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  to_address text not null,
  from_address text not null,
  reply_to text,
  subject text not null,
  html_body text,
  text_body text not null,
  headers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists email_outbox_created_at_idx on public.email_outbox (created_at desc);

alter table public.email_outbox enable row level security;

create policy "admins can read the email outbox" on public.email_outbox
  for select using (public.is_admin());

create policy "admins can purge the email outbox" on public.email_outbox
  for delete using (public.is_admin());
