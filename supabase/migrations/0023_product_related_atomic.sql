-- Task 7 item #6: product_related had zero admin UI, zero query, and zero
-- public rendering — confirmed by grep across lib/ and components/. This
-- extends save_product_atomic (0022_product_and_reorder_atomic.sql) to
-- replace product_related rows the same way it already replaces
-- product_industries/product_applications, so a product's related-products
-- list is written atomically alongside everything else in one function
-- call, not a separate unguarded delete-then-reinsert on the caller's own
-- session client.
--
-- Adding a parameter changes the function's argument-type signature, so
-- `create or replace function` alone would create a second, ambiguous
-- overload rather than actually replacing the existing one — the old
-- 7-argument signature is dropped first, then the 8-argument version is
-- created. p_related_ids is appended at the end (after p_product_id,
-- which already has a default) with its own default, keeping every
-- defaultable parameter trailing and contiguous, same constraint noted in
-- 0022's header comment.

drop function if exists public.save_product_atomic(jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, uuid);

create or replace function public.save_product_atomic(
  p_meta jsonb,
  p_benefits jsonb,
  p_stages jsonb,
  p_specs jsonb,
  p_industry_ids jsonb,
  p_application_ids jsonb,
  p_product_id uuid default null,
  p_related_ids jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product_id uuid;
  v_current_status text;
  v_new_status text := coalesce(nullif(p_meta->>'status', ''), 'draft');
begin
  if not public.has_capability('edit_drafts') then
    raise exception 'Not authorized';
  end if;

  if p_product_id is not null then
    select status into v_current_status from products where id = p_product_id for update;
    if not found then raise exception 'Product not found'; end if;
  end if;

  if v_new_status is distinct from v_current_status
     and (v_new_status = 'published' or v_current_status = 'published')
     and not public.has_capability('publish') then
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

  -- product_related.check(product_id <> related_product_id) rejects a
  -- self-reference outright (rolling back the whole save) rather than
  -- silently storing one — the admin UI already excludes the product
  -- being edited from its own "related products" option list
  -- (getProductRelationOptionsAction), and saveProductAction filters it
  -- out defensively too, so this should never actually fire in practice.
  delete from product_related where product_id = v_product_id;
  insert into product_related (product_id, related_product_id, position)
  select v_product_id, elem.value::uuid, (elem.ordinality - 1)::int
  from jsonb_array_elements_text(coalesce(p_related_ids, '[]'::jsonb)) with ordinality as elem(value, ordinality);

  perform public.record_audit(
    case when p_product_id is null then 'create' else 'update' end,
    'product',
    v_product_id,
    jsonb_build_object(
      'slug', p_meta->>'slug',
      'status', p_meta->>'status',
      'benefit_count', jsonb_array_length(coalesce(p_benefits, '[]'::jsonb)),
      'stage_count', jsonb_array_length(coalesce(p_stages, '[]'::jsonb)),
      'spec_count', jsonb_array_length(coalesce(p_specs, '[]'::jsonb)),
      'related_count', jsonb_array_length(coalesce(p_related_ids, '[]'::jsonb))
    )
  );

  return v_product_id;
end;
$$;

-- Same lockdown as 0022's header comment explains: a newly created
-- function is directly callable by anon/authenticated via PostgREST RPC
-- until revoked explicitly, independent of the internal has_capability()
-- check.
revoke all on function public.save_product_atomic(jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, uuid, jsonb) from public;
revoke execute on function public.save_product_atomic(jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, uuid, jsonb) from anon;
grant execute on function public.save_product_atomic(jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, uuid, jsonb) to authenticated;
