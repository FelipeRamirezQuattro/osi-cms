-- 0047: product_blocks — free-form content blocks on a product detail page,
-- rendered after the fixed sections (benefits / stages / video / how it
-- works / specs). Mirrors page_blocks so the same block registry, renderer
-- and editor fields apply. Exists because imported Wix product pages carry
-- content the fixed product structure can't hold: extra videos, image runs,
-- comparison sections, a second headed list ("Advantages").
--
-- RLS follows the other product child tables (0011 Group C): readable when
-- the parent product is published (and the block is visible) or by staff;
-- writes are staff-only. No status column of its own — the parent's decides.

create table product_blocks (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  type text not null,
  position int not null default 0,
  is_visible boolean not null default true,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index product_blocks_product_id_idx on product_blocks (product_id, position);

create trigger set_updated_at
before update on product_blocks
for each row execute function public.set_updated_at();

alter table product_blocks enable row level security;

create policy "read product_blocks"
  on product_blocks for select
  using (
    (is_visible and exists (
      select 1 from products p where p.id = product_blocks.product_id and p.status = 'published'
    ))
    or public.is_staff()
  );

create policy "staff insert product_blocks"
  on product_blocks for insert
  with check (public.is_staff());

create policy "staff update product_blocks"
  on product_blocks for update
  using (public.is_staff())
  with check (public.is_staff());

create policy "staff delete product_blocks"
  on product_blocks for delete
  using (public.is_staff());
