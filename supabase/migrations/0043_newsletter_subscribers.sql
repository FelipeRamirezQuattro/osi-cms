-- Newsletter subscribers, tags and their junction (Phase 9, sub-project 2).
--
-- Every table here is staff-only for every operation. Public visitors never
-- touch these tables directly: the signup/confirm/unsubscribe Server Actions
-- go through the service-role client (lib/data/newsletter-subscribers.ts),
-- which bypasses RLS. That is deliberately stricter than form_submissions
-- (which allows anonymous INSERT): signup has to look an email up before
-- deciding what to do, and an anonymous SELECT on this table would leak the
-- whole list.
--
-- Confirm/unsubscribe links carry stateless HMAC tokens derived from the
-- subscriber id (lib/newsletter/tokens.ts), so there are no token columns to
-- store or leak.

create table newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email) and length(email) <= 254),
  status text not null default 'pending' check (status in ('pending', 'subscribed', 'unsubscribed')),
  source text not null default 'signup_form',
  page_slug text,
  ip_hash text,
  consented_at timestamptz not null default now(),
  confirmation_sent_at timestamptz,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index newsletter_subscribers_email_key on newsletter_subscribers (email);
create index newsletter_subscribers_status_idx on newsletter_subscribers (status);
-- Per-IP signup rate limiting counts recent rows by ip_hash.
create index newsletter_subscribers_ip_hash_idx on newsletter_subscribers (ip_hash, updated_at desc);

create trigger set_updated_at
before update on newsletter_subscribers
for each row execute function public.set_updated_at();

create table newsletter_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 60),
  created_at timestamptz not null default now()
);

create unique index newsletter_tags_name_key on newsletter_tags (lower(name));

create table newsletter_subscriber_tags (
  subscriber_id uuid not null references newsletter_subscribers (id) on delete cascade,
  tag_id uuid not null references newsletter_tags (id) on delete cascade,
  primary key (subscriber_id, tag_id)
);

-- The primary key covers lookups by subscriber_id; tag_id needs its own
-- index for "all subscribers with this tag" and for tag deletes.
create index newsletter_subscriber_tags_tag_id_idx on newsletter_subscriber_tags (tag_id);

alter table newsletter_subscribers enable row level security;
alter table newsletter_tags enable row level security;
alter table newsletter_subscriber_tags enable row level security;

-- One SELECT policy per table, then staff-only write policies (same shape as
-- every other table; see CLAUDE.md "Schema conventions").
create policy "staff can read subscribers" on newsletter_subscribers for select using (public.is_staff());
create policy "staff can insert subscribers" on newsletter_subscribers for insert with check (public.is_staff());
create policy "staff can update subscribers" on newsletter_subscribers for update using (public.is_staff()) with check (public.is_staff());
create policy "staff can delete subscribers" on newsletter_subscribers for delete using (public.is_staff());

create policy "staff can read newsletter tags" on newsletter_tags for select using (public.is_staff());
create policy "staff can insert newsletter tags" on newsletter_tags for insert with check (public.is_staff());
create policy "staff can update newsletter tags" on newsletter_tags for update using (public.is_staff()) with check (public.is_staff());
create policy "staff can delete newsletter tags" on newsletter_tags for delete using (public.is_staff());

create policy "staff can read subscriber tags" on newsletter_subscriber_tags for select using (public.is_staff());
create policy "staff can insert subscriber tags" on newsletter_subscriber_tags for insert with check (public.is_staff());
create policy "staff can update subscriber tags" on newsletter_subscriber_tags for update using (public.is_staff()) with check (public.is_staff());
create policy "staff can delete subscriber tags" on newsletter_subscriber_tags for delete using (public.is_staff());
