create table news_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  locale text not null default 'en',
  title text not null,
  kind text not null check (kind in ('news', 'conference', 'event')),
  excerpt text,
  body jsonb,
  cover_image_url text,
  published_at timestamptz,
  event_date timestamptz,
  event_location text,
  cta_label text,
  cta_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug, locale)
);

create index news_posts_status_idx on news_posts (status);
create index news_posts_published_at_idx on news_posts (published_at desc);

create trigger set_updated_at
before update on news_posts
for each row execute function public.set_updated_at();

alter table news_posts enable row level security;

create policy "public can read published news"
  on news_posts for select
  using (status = 'published');

create policy "staff manage news"
  on news_posts for all
  using (public.is_staff())
  with check (public.is_staff());

create table resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null check (kind in ('brochure', 'datasheet', 'certificate', 'manual')),
  file_url text not null,
  thumbnail_url text,
  product_id uuid references products (id) on delete set null,
  category text,
  position int not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index resources_product_id_idx on resources (product_id);
create index resources_status_idx on resources (status);

create trigger set_updated_at
before update on resources
for each row execute function public.set_updated_at();

alter table resources enable row level security;

create policy "public can read published resources"
  on resources for select
  using (status = 'published');

create policy "staff manage resources"
  on resources for all
  using (public.is_staff())
  with check (public.is_staff());
