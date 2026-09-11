create table pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  locale text not null default 'en',
  title text not null,
  template text not null default 'standard'
    check (template in ('standard', 'landing', 'legal', 'product', 'contact')),
  seo_title text,
  seo_description text,
  og_image_url text,
  noindex boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  updated_by uuid references auth.users (id),
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug, locale)
);

create index pages_status_idx on pages (status);

create trigger set_updated_at
before update on pages
for each row execute function public.set_updated_at();

alter table pages enable row level security;

create policy "public can read published pages"
  on pages for select
  using (status = 'published');

create policy "staff manage pages"
  on pages for all
  using (public.is_staff())
  with check (public.is_staff());

create table page_blocks (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references pages (id) on delete cascade,
  type text not null,
  position int not null,
  is_visible boolean not null default true,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page_id, position)
);

create index page_blocks_page_id_idx on page_blocks (page_id);

create trigger set_updated_at
before update on page_blocks
for each row execute function public.set_updated_at();

alter table page_blocks enable row level security;

create policy "public can read visible blocks of published pages"
  on page_blocks for select
  using (
    is_visible
    and exists (
      select 1 from pages p
      where p.id = page_blocks.page_id and p.status = 'published'
    )
  );

create policy "staff manage page blocks"
  on page_blocks for all
  using (public.is_staff())
  with check (public.is_staff());

-- Written on every publish (see master prompt 5.1); enables one-click
-- restore from the admin. No public access at all.
create table page_revisions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references pages (id) on delete cascade,
  snapshot jsonb not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index page_revisions_page_id_idx on page_revisions (page_id);

alter table page_revisions enable row level security;

create policy "staff manage page revisions"
  on page_revisions for all
  using (public.is_staff())
  with check (public.is_staff());
