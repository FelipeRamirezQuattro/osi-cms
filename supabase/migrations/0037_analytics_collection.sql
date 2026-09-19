-- Phase 8a: first-party visitor analytics collection. No Wix/GA/Vercel
-- Analytics equivalent exists anywhere in this codebase today (see
-- docs/DECISIONS.md) — these are the tables the /admin/analytics
-- reporting UI (Phase 8c) reads from.
--
-- Deliberately no separate "sessions" table with mutable counters.
-- Session-level facts (page_view_count, duration, bounce, entry
-- path/referrer) are derived at query time by grouping
-- analytics_page_views on session_id — every row here is insert-only,
-- so these tables can use the exact same RLS shape already proven by
-- form_submissions (public insert, staff-only select) instead of
-- introducing a new security-definer/atomic-RPC pattern just to allow
-- anon UPDATE access to a mutable row. The one piece of session-entry
-- context that must NOT change across a session (referrer/UTM/traffic
-- category — an internal navigation's document.referrer is the
-- previous page, not the original entry source) is captured once by the
-- collect route into a cookie and denormalized onto every page_view row
-- in that session, rather than looked up from a mutable session row.

create table analytics_page_views (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  visitor_id uuid not null,
  is_new_visitor boolean not null,
  path text not null,
  referrer_host text,
  traffic_category text not null check (traffic_category in ('direct', 'organic', 'social', 'referral', 'paid')),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  country text,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index analytics_page_views_created_at_idx on analytics_page_views (created_at);
create index analytics_page_views_session_id_idx on analytics_page_views (session_id);
create index analytics_page_views_path_idx on analytics_page_views (path);

alter table analytics_page_views enable row level security;

create policy "public can record page views"
  on analytics_page_views for insert
  with check (true);

create policy "staff can read page views"
  on analytics_page_views for select
  using (public.is_staff());

create policy "staff can delete page views"
  on analytics_page_views for delete
  using (public.is_staff());

create table analytics_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  visitor_id uuid not null,
  event_type text not null check (event_type in ('button_click', 'contact_click')),
  event_label text not null,
  path text not null,
  metadata jsonb,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index analytics_events_created_at_idx on analytics_events (created_at);
create index analytics_events_event_type_idx on analytics_events (event_type);

alter table analytics_events enable row level security;

create policy "public can record analytics events"
  on analytics_events for insert
  with check (true);

create policy "staff can read analytics events"
  on analytics_events for select
  using (public.is_staff());

create policy "staff can delete analytics events"
  on analytics_events for delete
  using (public.is_staff());

create table analytics_search_queries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  visitor_id uuid not null,
  query text not null,
  results_count int not null,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index analytics_search_queries_created_at_idx on analytics_search_queries (created_at);

alter table analytics_search_queries enable row level security;

create policy "public can record search queries"
  on analytics_search_queries for insert
  with check (true);

create policy "staff can read search queries"
  on analytics_search_queries for select
  using (public.is_staff());

create policy "staff can delete search queries"
  on analytics_search_queries for delete
  using (public.is_staff());

-- Bot/AI-crawler visits are logged from proxy.ts, not the client beacon
-- (bots typically don't execute JS) — no session/visitor_id, since a
-- bot has neither.
create table analytics_bot_visits (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  user_agent text,
  bot_name text not null,
  bot_category text not null check (bot_category in ('search_bot', 'ai_bot', 'other_bot')),
  created_at timestamptz not null default now()
);

create index analytics_bot_visits_created_at_idx on analytics_bot_visits (created_at);
create index analytics_bot_visits_bot_category_idx on analytics_bot_visits (bot_category);

alter table analytics_bot_visits enable row level security;

create policy "public can record bot visits"
  on analytics_bot_visits for insert
  with check (true);

create policy "staff can read bot visits"
  on analytics_bot_visits for select
  using (public.is_staff());

create policy "staff can delete bot visits"
  on analytics_bot_visits for delete
  using (public.is_staff());
