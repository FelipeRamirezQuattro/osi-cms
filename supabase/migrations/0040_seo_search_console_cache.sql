-- Phase 8b: lazy TTL cache for Google Search Console API responses.
-- GSC data updates roughly daily and rate-limits queries, and this
-- project has no Vercel Cron usage anywhere (see docs/DECISIONS.md for
-- why a proactive warm job was deferred) — admin routes are already
-- force-dynamic, so "check fetched_at, refetch if stale" needs no new
-- infrastructure. Never touched by anon at all (unlike the Phase 8a
-- collection tables), so there's no public/staff RLS split to design.
create table analytics_gsc_cache (
  id uuid primary key default gen_random_uuid(),
  report_key text not null,
  params_hash text not null,
  response jsonb not null,
  fetched_at timestamptz not null default now(),
  unique (report_key, params_hash)
);

alter table analytics_gsc_cache enable row level security;

create policy "staff manage gsc cache"
  on analytics_gsc_cache for all
  using (public.is_staff())
  with check (public.is_staff());
