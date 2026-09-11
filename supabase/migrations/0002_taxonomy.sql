-- Product categories (no draft state — a fixed, small structural list
-- the admin reorders/renames but doesn't unpublish) and the filter-tab
-- taxonomy (industries, applications, services) which do carry a
-- status: the master prompt's RLS rule (5.8) assumes every content
-- table is publish-gated, but industries/applications/services weren't
-- specced with a status column — added here for consistency (see
-- docs/DECISIONS.md).

create table product_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
before update on product_categories
for each row execute function public.set_updated_at();

alter table product_categories enable row level security;

create policy "public can read product categories"
  on product_categories for select
  using (true);

create policy "staff manage product categories"
  on product_categories for all
  using (public.is_staff())
  with check (public.is_staff());

create table industries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  icon_key text,
  description text,
  position int not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
before update on industries
for each row execute function public.set_updated_at();

alter table industries enable row level security;

create policy "public can read published industries"
  on industries for select
  using (status = 'published');

create policy "staff manage industries"
  on industries for all
  using (public.is_staff())
  with check (public.is_staff());

create table applications (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  position int not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
before update on applications
for each row execute function public.set_updated_at();

alter table applications enable row level security;

create policy "public can read published applications"
  on applications for select
  using (status = 'published');

create policy "staff manage applications"
  on applications for all
  using (public.is_staff())
  with check (public.is_staff());

create table services (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  locale text not null default 'en',
  name text not null,
  summary text,
  body jsonb,
  hero_image_url text,
  position int not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug, locale)
);

create trigger set_updated_at
before update on services
for each row execute function public.set_updated_at();

alter table services enable row level security;

create policy "public can read published services"
  on services for select
  using (status = 'published');

create policy "staff manage services"
  on services for all
  using (public.is_staff())
  with check (public.is_staff());
