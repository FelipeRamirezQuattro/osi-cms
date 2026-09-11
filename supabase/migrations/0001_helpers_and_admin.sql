-- Generic updated_at trigger, and the admin_profiles table + RLS helper
-- functions everything else depends on. Plain Postgres/RLS — the only
-- Supabase-specific coupling is the FK to auth.users (see CLAUDE.md
-- constraint 2: "no Supabase-proprietary DDL outside of auth/storage
-- glue").

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table admin_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'editor' check (role in ('admin', 'editor')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
before update on admin_profiles
for each row execute function public.set_updated_at();

-- security definer + owned by the migration role (postgres, which
-- bypasses RLS in Supabase) so checking "am I staff" doesn't recurse
-- into admin_profiles' own RLS.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from admin_profiles
    where user_id = auth.uid() and is_active
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from admin_profiles
    where user_id = auth.uid() and is_active and role = 'admin'
  );
$$;

alter table admin_profiles enable row level security;

-- Any active staff member can see the roster; only 'admin' role can
-- invite/edit/remove (see master prompt open question #8).
create policy "staff can view admin profiles"
  on admin_profiles for select
  using (public.is_staff());

create policy "admins can add admin profiles"
  on admin_profiles for insert
  with check (public.is_admin());

create policy "admins can update admin profiles"
  on admin_profiles for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins can remove admin profiles"
  on admin_profiles for delete
  using (public.is_admin());

-- Bootstrapping note: the very first admin_profiles row has no existing
-- admin to grant it, so it must be inserted with the service-role
-- client (bypasses RLS entirely), not through the app.
