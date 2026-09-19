-- Newsletter campaigns and per-recipient delivery rows (Phase 9, sub-project 3).
--
-- Staff-only under RLS, like the subscriber tables. Sending runs through
-- Server Actions using the staff session, so no service-role access is
-- needed here.
--
-- A campaign is `draft` (editable) -> `sending` (recipients snapshotted,
-- batches going out) -> `sent` | `failed`. Recipient rows make sending
-- resumable and idempotent: each batch only picks up `pending` rows, and the
-- unique (campaign_id, subscriber_id) lets recipient preparation be re-run
-- safely after an interruption.

create table newsletter_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  subject text not null default '' check (length(subject) <= 200),
  preheader text not null default '' check (length(preheader) <= 200),
  -- Ordered [{ "type": "...", "data": {...} }], validated against the email
  -- block registry (lib/email-blocks/registry.ts) on every save.
  blocks jsonb not null default '[]'::jsonb check (jsonb_typeof(blocks) = 'array'),
  -- Audience: subscribed people carrying ANY of these tags; empty = everyone
  -- subscribed. Not a foreign key (arrays can't be) — a deleted tag just
  -- stops matching anyone.
  tag_ids uuid[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'sending', 'sent', 'failed')),
  -- Null while a `sending` campaign's recipients are still being prepared.
  total_recipients integer check (total_recipients is null or total_recipients >= 0),
  started_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index newsletter_campaigns_status_idx on newsletter_campaigns (status, created_at desc);

create trigger set_updated_at
before update on newsletter_campaigns
for each row execute function public.set_updated_at();

create table newsletter_campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references newsletter_campaigns (id) on delete cascade,
  -- Cascades so erasing a subscriber also erases their delivery rows; the
  -- address itself is read from the subscriber at send time, never copied.
  subscriber_id uuid not null references newsletter_subscribers (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  provider_message_id text,
  error text,
  sent_at timestamptz,
  unique (campaign_id, subscriber_id)
);

-- Batch pickup: "next pending rows for this campaign".
create index newsletter_campaign_recipients_campaign_status_idx on newsletter_campaign_recipients (campaign_id, status);
-- FK index (the unique constraint covers campaign_id, not subscriber_id).
create index newsletter_campaign_recipients_subscriber_idx on newsletter_campaign_recipients (subscriber_id);

alter table newsletter_campaigns enable row level security;
alter table newsletter_campaign_recipients enable row level security;

create policy "staff can read campaigns" on newsletter_campaigns for select using (public.is_staff());
create policy "staff can insert campaigns" on newsletter_campaigns for insert with check (public.is_staff());
create policy "staff can update campaigns" on newsletter_campaigns for update using (public.is_staff()) with check (public.is_staff());
create policy "staff can delete campaigns" on newsletter_campaigns for delete using (public.is_staff());

create policy "staff can read campaign recipients" on newsletter_campaign_recipients for select using (public.is_staff());
create policy "staff can insert campaign recipients" on newsletter_campaign_recipients for insert with check (public.is_staff());
create policy "staff can update campaign recipients" on newsletter_campaign_recipients for update using (public.is_staff()) with check (public.is_staff());
create policy "staff can delete campaign recipients" on newsletter_campaign_recipients for delete using (public.is_staff());
