-- Redirects can target content BY IDENTITY, resolved at request time (lib/redirects/resolver.ts):
--   target_product_id -> the product's current URL once published; until then its category's
--                        product listing (/products?category=<slug>), or /products with no category;
--   target_page_id    -> the page's published path; until then `fallback_path` (else "/").
-- `to_path` stays for plain path targets. A redirect therefore keeps answering with its stored 301
-- while a draft is published, renamed, recategorised or retired — only the destination changes.
--
-- At most one of to_path / target_product_id / target_page_id is set (the admin form requires exactly
-- one). Zero is allowed ONLY as the state after the target row is deleted (ON DELETE SET NULL): the
-- redirect then falls back to fallback_path / "/products" instead of blocking the delete or vanishing.
--
-- redirect_index() is what proxy.ts reads, in ONE query, every 60s (not per request). The draft
-- product/page rows aren't readable by anon under RLS, so it is a SECURITY DEFINER function that
-- returns only what resolution needs and NEVER a draft's slug (a draft product exposes just its
-- category slug; a draft page exposes nothing but the row's own fallback_path).

alter table public.redirects
  alter column to_path drop not null,
  add column target_product_id uuid references public.products (id) on delete set null,
  add column target_page_id uuid references public.pages (id) on delete set null,
  add column fallback_path text,
  add column note text;

alter table public.redirects
  add constraint redirects_single_target_check
    check (num_nonnulls(to_path, target_product_id, target_page_id) <= 1),
  add constraint redirects_fallback_path_check
    check (fallback_path is null or (fallback_path ~ '^/[^[:space:]]*$' and fallback_path !~ '^//'));

create index redirects_target_product_id_idx on public.redirects (target_product_id);
create index redirects_target_page_id_idx on public.redirects (target_page_id);

create or replace function public.redirect_index()
returns table (
  from_path text,
  to_path text,
  status_code integer,
  target_kind text,
  product_published boolean,
  product_slug text,
  category_slug text,
  page_published boolean,
  page_slug text,
  fallback_path text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.from_path,
    r.to_path,
    r.status_code,
    case
      when r.target_product_id is not null then 'product'
      when r.target_page_id is not null then 'page'
      when r.to_path is not null then 'path'
      else 'none'
    end,
    (p.status = 'published'),
    case when p.status = 'published' then p.slug end,
    c.slug,
    (pub.page_id is not null),
    pub.slug,
    r.fallback_path
  from public.redirects r
  left join public.products p on p.id = r.target_product_id
  left join public.product_categories c on c.id = p.category_id
  left join public.page_publications pub on pub.page_id = r.target_page_id;
$$;

revoke all on function public.redirect_index() from public;
grant execute on function public.redirect_index() to anon, authenticated;
