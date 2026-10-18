-- A nav item can reference a product by identity. Its public href is then
-- built from that product's *current* category + slug (lib/data/navigation.ts
-- getNavMenu), and the item hides itself while the product isn't published.
-- Before this, the mega menu matched a typed href against published product
-- URLs, so a slug/category typo (or a later category change) silently dropped
-- the link even after the product was published.
--
-- `href` stays NOT NULL: plain links keep using it, and for a product item it
-- is only a stored fallback/display value (kept in sync by the admin form).
-- on delete set null: deleting a product degrades the item to its stored href
-- (still guarded against 404s at render) instead of blocking the delete.
-- RLS needs no change: nav_items' existing policies are row-level, not column-level.

alter table public.nav_items
  add column product_id uuid references public.products (id) on delete set null;

create index nav_items_product_id_idx on public.nav_items (product_id);
