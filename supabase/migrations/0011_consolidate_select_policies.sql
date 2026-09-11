-- Advisor fix: "staff manage X" (for all) + a separate public select
-- policy meant Postgres evaluated two permissive policies on every
-- SELECT. Consolidate to one SELECT policy per table (public condition
-- OR public.is_staff()) plus separate staff-only insert/update/delete
-- policies.

-- Group A: no draft/publish gate, public reads everything.
do $$
declare
  t text;
begin
  foreach t in array array[
    'nav_menus', 'nav_items', 'site_settings', 'media_assets',
    'redirects', 'product_categories'
  ]
  loop
    execute format('drop policy if exists %I on %I', 'staff manage ' || replace(t, '_', ' '), t);
    execute format('drop policy if exists %I on %I', 'public can read ' || replace(t, '_', ' '), t);
    execute format(
      $p$create policy "read %1$s" on %1$I for select using (true)$p$, t
    );
    execute format(
      'create policy "staff insert %1$s" on %1$I for insert with check (public.is_staff())', t
    );
    execute format(
      'create policy "staff update %1$s" on %1$I for update using (public.is_staff()) with check (public.is_staff())', t
    );
    execute format(
      'create policy "staff delete %1$s" on %1$I for delete using (public.is_staff())', t
    );
  end loop;
end $$;

-- Group B: draft/published content tables. Two tables' original policy
-- names don't follow the generic "staff manage <table>" / "public can
-- read published <table>" pattern — drop those explicitly first.
drop policy if exists "staff manage news" on news_posts;
drop policy if exists "public can read published news" on news_posts;
drop policy if exists "staff manage directory contacts" on directory_contacts;
drop policy if exists "public can read published directory contacts" on directory_contacts;

do $$
declare
  t text;
begin
  foreach t in array array[
    'industries', 'applications', 'services', 'products', 'pages',
    'news_posts', 'resources', 'locations', 'directory_contacts'
  ]
  loop
    execute format('drop policy if exists %I on %I', 'staff manage ' || t, t);
    execute format('drop policy if exists %I on %I', 'public can read published ' || t, t);
    execute format(
      $p$create policy "read %1$s" on %1$I for select using (status = 'published' or public.is_staff())$p$, t
    );
    execute format(
      'create policy "staff insert %1$s" on %1$I for insert with check (public.is_staff())', t
    );
    execute format(
      'create policy "staff update %1$s" on %1$I for update using (public.is_staff()) with check (public.is_staff())', t
    );
    execute format(
      'create policy "staff delete %1$s" on %1$I for delete using (public.is_staff())', t
    );
  end loop;
end $$;

-- Group C: product child/junction tables, gated by the parent product.
do $$
declare
  t text;
begin
  foreach t in array array[
    'product_benefits', 'product_stages', 'product_specs',
    'product_related', 'product_industries', 'product_applications'
  ]
  loop
    execute format('drop policy if exists %I on %I', 'staff manage ' || t, t);
    execute format('drop policy if exists %I on %I', 'public can read via published product', t);
    execute format(
      $p$create policy "read %1$s" on %1$I for select using (
        exists (select 1 from products p where p.id = %1$I.product_id and p.status = 'published')
        or public.is_staff()
      )$p$, t
    );
    execute format(
      'create policy "staff insert %1$s" on %1$I for insert with check (public.is_staff())', t
    );
    execute format(
      'create policy "staff update %1$s" on %1$I for update using (public.is_staff()) with check (public.is_staff())', t
    );
    execute format(
      'create policy "staff delete %1$s" on %1$I for delete using (public.is_staff())', t
    );
  end loop;
end $$;

-- Group D: page_blocks (visible + parent page published, or staff).
drop policy if exists "staff manage page blocks" on page_blocks;
drop policy if exists "public can read visible blocks of published pages" on page_blocks;

create policy "read page_blocks"
  on page_blocks for select
  using (
    (is_visible and exists (
      select 1 from pages p where p.id = page_blocks.page_id and p.status = 'published'
    ))
    or public.is_staff()
  );

create policy "staff insert page_blocks"
  on page_blocks for insert
  with check (public.is_staff());

create policy "staff update page_blocks"
  on page_blocks for update
  using (public.is_staff())
  with check (public.is_staff());

create policy "staff delete page_blocks"
  on page_blocks for delete
  using (public.is_staff());
