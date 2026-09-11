create table nav_menus (
  id uuid primary key default gen_random_uuid(),
  key text not null unique
    check (key in ('primary', 'utility', 'footer-1', 'footer-2', 'footer-3', 'footer-4', 'mega')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
before update on nav_menus
for each row execute function public.set_updated_at();

alter table nav_menus enable row level security;

create policy "public can read nav menus"
  on nav_menus for select
  using (true);

create policy "staff manage nav menus"
  on nav_menus for all
  using (public.is_staff())
  with check (public.is_staff());

create table nav_items (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references nav_menus (id) on delete cascade,
  parent_id uuid references nav_items (id) on delete cascade,
  label text not null,
  href text not null,
  badge text,
  position int not null default 0,
  is_external boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index nav_items_menu_id_idx on nav_items (menu_id);
create index nav_items_parent_id_idx on nav_items (parent_id);

create trigger set_updated_at
before update on nav_items
for each row execute function public.set_updated_at();

alter table nav_items enable row level security;

create policy "public can read nav items"
  on nav_items for select
  using (true);

create policy "staff manage nav items"
  on nav_items for all
  using (public.is_staff())
  with check (public.is_staff());

-- Singleton row: the boolean PK + check(id) trick guarantees exactly
-- one row can ever exist.
create table site_settings (
  id boolean primary key default true check (id),
  phone text,
  email text,
  address_lines text[],
  map_embed_url text,
  social_facebook text,
  social_linkedin text,
  social_youtube text,
  social_instagram text,
  footer_tagline text,
  default_og_image text,
  announcement_bar jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
before update on site_settings
for each row execute function public.set_updated_at();

alter table site_settings enable row level security;

create policy "public can read site settings"
  on site_settings for select
  using (true);

create policy "staff manage site settings"
  on site_settings for all
  using (public.is_staff())
  with check (public.is_staff());

insert into site_settings (id, phone, address_lines)
values (true, '+1 (432) 580-7111', array['1001 E. Pearl Street', 'Odessa, TX 79761 (USA)']);

create table media_assets (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  alt text,
  width int,
  height int,
  mime text,
  source text not null default 'legacy' check (source in ('legacy', 'uploaded')),
  title text,
  folder text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index media_assets_source_idx on media_assets (source);

create trigger set_updated_at
before update on media_assets
for each row execute function public.set_updated_at();

alter table media_assets enable row level security;

create policy "public can read media assets"
  on media_assets for select
  using (true);

create policy "staff manage media assets"
  on media_assets for all
  using (public.is_staff())
  with check (public.is_staff());
