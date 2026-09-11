create table products (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  locale text not null default 'en',
  name text not null,
  category_id uuid references product_categories (id) on delete set null,
  eyebrow text,
  tagline text,
  badge text check (badge in ('new', 'featured')),
  summary text,
  body jsonb,
  hero_image_url text,
  diagram_image_url text,
  video_url text,
  brochure_pdf_url text,
  model_3d_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  position int not null default 0,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug, locale)
);

create index products_category_id_idx on products (category_id);
create index products_status_idx on products (status);

create trigger set_updated_at
before update on products
for each row execute function public.set_updated_at();

alter table products enable row level security;

create policy "public can read published products"
  on products for select
  using (status = 'published');

create policy "staff manage products"
  on products for all
  using (public.is_staff())
  with check (public.is_staff());

create table product_benefits (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  title text not null,
  body text,
  icon_key text,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index product_benefits_product_id_idx on product_benefits (product_id);

create trigger set_updated_at
before update on product_benefits
for each row execute function public.set_updated_at();

create table product_stages (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  title text not null,
  body text,
  image_url text,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index product_stages_product_id_idx on product_stages (product_id);

create trigger set_updated_at
before update on product_stages
for each row execute function public.set_updated_at();

create table product_specs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  label text not null,
  value text not null,
  unit text,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index product_specs_product_id_idx on product_specs (product_id);

create trigger set_updated_at
before update on product_specs
for each row execute function public.set_updated_at();

create table product_related (
  product_id uuid not null references products (id) on delete cascade,
  related_product_id uuid not null references products (id) on delete cascade,
  position int not null default 0,
  primary key (product_id, related_product_id),
  check (product_id <> related_product_id)
);

create table product_industries (
  product_id uuid not null references products (id) on delete cascade,
  industry_id uuid not null references industries (id) on delete cascade,
  primary key (product_id, industry_id)
);

create table product_applications (
  product_id uuid not null references products (id) on delete cascade,
  application_id uuid not null references applications (id) on delete cascade,
  primary key (product_id, application_id)
);

-- Child/junction tables: publicly readable only through a published
-- parent product; fully managed by staff otherwise.
do $$
declare
  t text;
begin
  foreach t in array array[
    'product_benefits', 'product_stages', 'product_specs',
    'product_related', 'product_industries', 'product_applications'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format(
      $p$create policy "public can read via published product" on %I
        for select using (
          exists (
            select 1 from products p
            where p.id = %I.product_id and p.status = 'published'
          )
        )$p$,
      t, t
    );
    execute format(
      'create policy "staff manage %1$s" on %1$s for all using (public.is_staff()) with check (public.is_staff())',
      t
    );
  end loop;
end $$;
