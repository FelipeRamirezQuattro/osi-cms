-- Task 5: transactional + audited compound writes for products and
-- reorder swaps. Same shape as 0017_publishing_permissions_atomic.sql's
-- atomic functions — security definer, has_capability() check inside,
-- multi-statement work in one function body (implicitly one transaction),
-- record_audit() before returning.
--
-- 1. save_product_atomic / delete_product_atomic
--    lib/data/products.ts's saveProductChildren did a delete-then-
--    reinsert across product_benefits/product_stages/product_specs/
--    product_industries/product_applications using the caller's own
--    session client, with zero transaction and zero error-checking on
--    the delete calls (flagged in Task 4's review as a real corruption
--    risk — an RLS policy change alone could silently break it, leaving
--    a product with, say, deleted benefits but stale stages). This
--    folds the product row's own create-or-update *and* all 5 child
--    tables into one function body, so a failure partway through
--    (a bad industry_id, a constraint violation) rolls back everything,
--    including the meta change, instead of leaving a half-saved row.
--    is_new (p_product_id is null) picks insert vs. update — mirrors
--    saveProductAction's existing branch, just moved inside the
--    transaction instead of split across a separate createProductRow/
--    updateProductRow call plus the unguarded child replace.
--
--    delete_product_atomic mirrors delete_page_atomic: the product ->
--    child cascade is already a single statement (ON DELETE CASCADE on
--    every child/junction table, migration 0003), so it was already
--    atomic — what it lacked was an audit entry and a capability check
--    independent of RLS. Wrapping it gets both for free, same pattern
--    as every other *_atomic function here.
--
-- 2. swap_entity_position / swap_nav_item_position
--    lib/data/admin-entities.ts's moveEntityRow and lib/data/
--    navigation.ts's moveNavItem both did read-then-two-sequential-
--    updates with no transaction — a failure between the two updates
--    leaves two rows with the same `position`. Two functions rather than
--    one: they gate on different capabilities (edit_drafts for ordinary
--    content reordering vs. manage_navigation for nav, per Task 4's
--    capability model) and nav_items isn't one of the generic
--    entity-config tables. swap_entity_position takes a table name as a
--    genuine runtime parameter (lib/admin/entity-config.ts's `table` is
--    a plain string, not a Database key — see docs/DECISIONS.md), so it
--    is gated by an explicit allowlist inside the function body, the
--    same defense used in 0021's `foreach t in array array[...]` — the
--    TypeScript-side validation in entity-config.ts must not be the only
--    thing standing between a request and an arbitrary table name.
--    swap_nav_item_position needs no dynamic SQL at all — it only ever
--    operates on nav_items — so it skips the allowlist question
--    entirely by construction.

create or replace function public.save_product_atomic(
  p_product_id uuid,
  p_meta jsonb,
  p_benefits jsonb,
  p_stages jsonb,
  p_specs jsonb,
  p_industry_ids jsonb,
  p_application_ids jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product_id uuid;
begin
  if not public.has_capability('edit_drafts') then
    raise exception 'Not authorized';
  end if;

  if p_product_id is null then
    insert into products (
      slug, locale, name, category_id, eyebrow, tagline, badge, summary, body,
      hero_image_url, diagram_image_url, video_url, brochure_pdf_url, model_3d_url,
      status, position, seo_title, seo_description
    ) values (
      trim(both '/' from p_meta->>'slug'),
      coalesce(nullif(p_meta->>'locale', ''), 'en'),
      trim(p_meta->>'name'),
      nullif(p_meta->>'category_id', '')::uuid,
      nullif(trim(p_meta->>'eyebrow'), ''),
      nullif(trim(p_meta->>'tagline'), ''),
      nullif(p_meta->>'badge', ''),
      nullif(trim(p_meta->>'summary'), ''),
      p_meta->'body',
      nullif(trim(p_meta->>'hero_image_url'), ''),
      nullif(trim(p_meta->>'diagram_image_url'), ''),
      nullif(trim(p_meta->>'video_url'), ''),
      nullif(trim(p_meta->>'brochure_pdf_url'), ''),
      nullif(trim(p_meta->>'model_3d_url'), ''),
      coalesce(nullif(p_meta->>'status', ''), 'draft'),
      coalesce((p_meta->>'position')::int, 0),
      nullif(trim(p_meta->>'seo_title'), ''),
      nullif(trim(p_meta->>'seo_description'), '')
    )
    returning id into v_product_id;
  else
    v_product_id := p_product_id;
    update products set
      slug = trim(both '/' from p_meta->>'slug'),
      locale = coalesce(nullif(p_meta->>'locale', ''), 'en'),
      name = trim(p_meta->>'name'),
      category_id = nullif(p_meta->>'category_id', '')::uuid,
      eyebrow = nullif(trim(p_meta->>'eyebrow'), ''),
      tagline = nullif(trim(p_meta->>'tagline'), ''),
      badge = nullif(p_meta->>'badge', ''),
      summary = nullif(trim(p_meta->>'summary'), ''),
      body = p_meta->'body',
      hero_image_url = nullif(trim(p_meta->>'hero_image_url'), ''),
      diagram_image_url = nullif(trim(p_meta->>'diagram_image_url'), ''),
      video_url = nullif(trim(p_meta->>'video_url'), ''),
      brochure_pdf_url = nullif(trim(p_meta->>'brochure_pdf_url'), ''),
      model_3d_url = nullif(trim(p_meta->>'model_3d_url'), ''),
      status = coalesce(nullif(p_meta->>'status', ''), status),
      seo_title = nullif(trim(p_meta->>'seo_title'), ''),
      seo_description = nullif(trim(p_meta->>'seo_description'), '')
    where id = v_product_id;
    if not found then raise exception 'Product not found'; end if;
  end if;

  delete from product_benefits where product_id = v_product_id;
  insert into product_benefits (product_id, title, body, icon_key, position)
  select
    v_product_id,
    item.value->>'title',
    nullif(item.value->>'body', ''),
    nullif(item.value->>'icon_key', ''),
    (item.ordinality - 1)::int
  from jsonb_array_elements(coalesce(p_benefits, '[]'::jsonb)) with ordinality as item(value, ordinality);

  delete from product_stages where product_id = v_product_id;
  insert into product_stages (product_id, title, body, image_url, position)
  select
    v_product_id,
    item.value->>'title',
    nullif(item.value->>'body', ''),
    nullif(item.value->>'image_url', ''),
    (item.ordinality - 1)::int
  from jsonb_array_elements(coalesce(p_stages, '[]'::jsonb)) with ordinality as item(value, ordinality);

  delete from product_specs where product_id = v_product_id;
  insert into product_specs (product_id, label, value, unit, position)
  select
    v_product_id,
    item.value->>'label',
    item.value->>'value',
    nullif(item.value->>'unit', ''),
    (item.ordinality - 1)::int
  from jsonb_array_elements(coalesce(p_specs, '[]'::jsonb)) with ordinality as item(value, ordinality);

  delete from product_industries where product_id = v_product_id;
  insert into product_industries (product_id, industry_id)
  select v_product_id, elem::uuid
  from jsonb_array_elements_text(coalesce(p_industry_ids, '[]'::jsonb)) as elem;

  delete from product_applications where product_id = v_product_id;
  insert into product_applications (product_id, application_id)
  select v_product_id, elem::uuid
  from jsonb_array_elements_text(coalesce(p_application_ids, '[]'::jsonb)) as elem;

  perform public.record_audit(
    case when p_product_id is null then 'create' else 'update' end,
    'product',
    v_product_id,
    jsonb_build_object(
      'slug', p_meta->>'slug',
      'status', p_meta->>'status',
      'benefit_count', jsonb_array_length(coalesce(p_benefits, '[]'::jsonb)),
      'stage_count', jsonb_array_length(coalesce(p_stages, '[]'::jsonb)),
      'spec_count', jsonb_array_length(coalesce(p_specs, '[]'::jsonb))
    )
  );

  return v_product_id;
end;
$$;

create or replace function public.delete_product_atomic(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  product_slug text;
begin
  if not public.has_capability('delete_content') then raise exception 'Not authorized'; end if;
  select slug into product_slug from products where id = p_product_id for update;
  if not found then raise exception 'Product not found'; end if;

  perform public.record_audit('delete', 'product', p_product_id, jsonb_build_object('slug', product_slug));
  delete from products where id = p_product_id;
end;
$$;

create or replace function public.swap_entity_position(p_table text, p_id_a uuid, p_id_b uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Explicit allowlist, independent of lib/admin/entity-config.ts's own
  -- validation — see this migration's header comment. Keep in sync with
  -- every EntityConfig.hasPosition:true table plus 'products' (which
  -- reuses moveEntityRow via moveProductAction but isn't itself part of
  -- the generic entity-config table set).
  allowed constant text[] := array[
    'products', 'industries', 'applications', 'resources', 'locations', 'directory_contacts'
  ];
  pos_a int;
  pos_b int;
begin
  if not public.has_capability('edit_drafts') then
    raise exception 'Not authorized';
  end if;
  if not (p_table = any(allowed)) then
    raise exception 'Table % is not reorderable', p_table;
  end if;

  execute format('select position from %I where id = $1 for update', p_table) into pos_a using p_id_a;
  if pos_a is null then raise exception 'Row not found: %', p_id_a; end if;
  execute format('select position from %I where id = $1 for update', p_table) into pos_b using p_id_b;
  if pos_b is null then raise exception 'Row not found: %', p_id_b; end if;

  execute format('update %I set position = $1 where id = $2', p_table) using pos_b, p_id_a;
  execute format('update %I set position = $1 where id = $2', p_table) using pos_a, p_id_b;

  perform public.record_audit('reorder', p_table, p_id_a, jsonb_build_object('swapped_with', p_id_b));
end;
$$;

create or replace function public.swap_nav_item_position(p_id_a uuid, p_id_b uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  pos_a int;
  pos_b int;
begin
  if not public.has_capability('manage_navigation') then
    raise exception 'Not authorized';
  end if;

  select position into pos_a from nav_items where id = p_id_a for update;
  if pos_a is null then raise exception 'Nav item not found: %', p_id_a; end if;
  select position into pos_b from nav_items where id = p_id_b for update;
  if pos_b is null then raise exception 'Nav item not found: %', p_id_b; end if;

  update nav_items set position = pos_b where id = p_id_a;
  update nav_items set position = pos_a where id = p_id_b;

  perform public.record_audit('reorder', 'nav_item', p_id_a, jsonb_build_object('swapped_with', p_id_b));
end;
$$;

-- Lockdown: 0017 originally did just the PUBLIC revoke + authenticated
-- grant below, and 0019 later found that insufficient — Supabase
-- projects grant `execute on all functions in schema public` to `anon`/
-- `authenticated` as a default privilege at project bootstrap,
-- independent of the PUBLIC pseudo-role revoke, so a newly created
-- function stays directly callable by `anon` via PostgREST RPC until
-- that grant is revoked from `anon` explicitly (each function's own
-- has_capability(...) check still rejects the call internally, but
-- get_advisors flags the exposure regardless). Do both from the start
-- here instead of needing a 0023 follow-up fix migration the way 0017
-- did.
revoke all on function public.save_product_atomic(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) from public;
revoke all on function public.delete_product_atomic(uuid) from public;
revoke all on function public.swap_entity_position(text, uuid, uuid) from public;
revoke all on function public.swap_nav_item_position(uuid, uuid) from public;

revoke execute on function public.save_product_atomic(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) from anon;
revoke execute on function public.delete_product_atomic(uuid) from anon;
revoke execute on function public.swap_entity_position(text, uuid, uuid) from anon;
revoke execute on function public.swap_nav_item_position(uuid, uuid) from anon;

grant execute on function public.save_product_atomic(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.delete_product_atomic(uuid) to authenticated;
grant execute on function public.swap_entity_position(text, uuid, uuid) to authenticated;
grant execute on function public.swap_nav_item_position(uuid, uuid) to authenticated;
