create table form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_key text not null,
  payload jsonb not null,
  page_slug text,
  ip_hash text,
  user_agent text,
  status text not null default 'new' check (status in ('new', 'read', 'archived')),
  created_at timestamptz not null default now()
);

create index form_submissions_status_idx on form_submissions (status);
create index form_submissions_form_key_idx on form_submissions (form_key);

alter table form_submissions enable row level security;

-- Public can only insert (rate-limited server-side, per master prompt
-- 5.7) — never read back other people's submissions.
create policy "public can submit forms"
  on form_submissions for insert
  with check (true);

create policy "staff can read submissions"
  on form_submissions for select
  using (public.is_staff());

create policy "staff can update submissions"
  on form_submissions for update
  using (public.is_staff())
  with check (public.is_staff());

create policy "staff can delete submissions"
  on form_submissions for delete
  using (public.is_staff());

-- Not sensitive (just URL mappings) — public read simplifies resolving
-- redirects from the [slug] catch-all without a service-role client.
create table redirects (
  id uuid primary key default gen_random_uuid(),
  from_path text not null unique,
  to_path text not null,
  status_code int not null default 301 check (status_code in (301, 302, 307, 308)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
before update on redirects
for each row execute function public.set_updated_at();

alter table redirects enable row level security;

create policy "public can read redirects"
  on redirects for select
  using (true);

create policy "staff manage redirects"
  on redirects for all
  using (public.is_staff())
  with check (public.is_staff());

-- Append-only: no update/delete policy for anyone, staff included.
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id),
  entity text not null,
  entity_id uuid,
  action text not null,
  diff jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_entity_idx on audit_log (entity, entity_id);

alter table audit_log enable row level security;

create policy "staff can log actions"
  on audit_log for insert
  with check (public.is_staff());

create policy "staff can view audit log"
  on audit_log for select
  using (public.is_staff());
