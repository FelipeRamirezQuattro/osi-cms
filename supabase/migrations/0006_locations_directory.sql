-- locations and directory_contacts weren't specced with a status column
-- (master prompt 5.5) but directory_contacts holds real personal phone
-- numbers/emails for named employees (see docs/CONTENT-GAPS.md) — added
-- a status here so the admin has a way to unpublish/redact an entry
-- before it goes live, consistent with every other content table.

create table locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('hq', 'office', 'distributor', 'plant')),
  country text not null,
  country_code text,
  region text,
  state text,
  city text,
  address text,
  lat double precision,
  lng double precision,
  phone text,
  email text,
  is_featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published')),
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index locations_status_idx on locations (status);
create index locations_country_code_idx on locations (country_code);

create trigger set_updated_at
before update on locations
for each row execute function public.set_updated_at();

alter table locations enable row level security;

create policy "public can read published locations"
  on locations for select
  using (status = 'published');

create policy "staff manage locations"
  on locations for all
  using (public.is_staff())
  with check (public.is_staff());

create table directory_contacts (
  id uuid primary key default gen_random_uuid(),
  department text not null,
  name text not null,
  role text,
  address text,
  phone_cell text,
  phone_office text,
  email text,
  photo_url text,
  location_id uuid references locations (id) on delete set null,
  position int not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index directory_contacts_location_id_idx on directory_contacts (location_id);
create index directory_contacts_department_idx on directory_contacts (department);

create trigger set_updated_at
before update on directory_contacts
for each row execute function public.set_updated_at();

alter table directory_contacts enable row level security;

create policy "public can read published directory contacts"
  on directory_contacts for select
  using (status = 'published');

create policy "staff manage directory contacts"
  on directory_contacts for all
  using (public.is_staff())
  with check (public.is_staff());
