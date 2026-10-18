-- The 77 legacy Wix addresses from the 96-address inventory (docs/Formato-inspeccion-sitio-actual-OSI.docx)
-- that had no redirect and no page at the same path ("/blog" is already a live route, so it is not here).
-- All are 301s stored as REFERENCES where there is something to reference, so they follow the product or
-- page as it is published/recategorised; until then they land on a real page:
--   product -> /products?category=<its category> (or /products with no category);
--   page    -> the row's fallback_path (/news for events & training, /resources, /services as agreed);
--   path    -> the nearest section (products listing, /services, /hse, /contact, /blog, or "/").
-- Targets are PENDING OSI CONFIRMATION (note column): OSI may retire pages, which only changes the target,
-- never the 301. The one blog post (/single-post/…) has no reference column, so it points at /blog.
-- Idempotent (on conflict do nothing); the DO block aborts the whole migration if any slug failed to resolve.

insert into public.redirects (from_path, to_path, target_product_id, target_page_id, fallback_path, status_code, note)
select v.from_path, v.to_path, p.id, pg.id, v.fallback_path, 301, 'Pending OSI confirmation'
from (values
  ('/products-1', '/products', null, null, null),
  ('/wellbore-diagrams', null, null, 'wellbore-diagrams', '/resources'),
  ('/book-online', '/contact', null, null, null),
  ('/inquiry-services-page', null, null, 'inquiry-services', '/services'),
  ('/services-1', '/services', null, null, null),
  ('/iso-45001', '/hse', null, null, null),
  ('/category', '/blog', null, null, null),
  ('/case-study', null, null, 'case-study', '/services'),
  ('/services-2', '/services', null, null, null),
  ('/single-post/odessa-separator-inc-acquires-acs-pump-and-supply-from-diamondback-energy', '/blog', null, null, null),
  ('/esp-guardian-shield', null, 'esp-guardian-shield', null, null),
  ('/esp-high-erosion-resistan', null, 'esp-high-erosion-resistan', null, null),
  ('/esp-no-go-catcher', null, 'esp-no-go-catcher', null, null),
  ('/esp-sand-d', null, 'esp-sand-d', null, null),
  ('/esp-sand-lift', null, 'esp-sand-lift', null, null),
  ('/esp-screen-vortex-desander-osi', null, 'esp-screen-vortex-desander', null, null),
  ('/esp-surge-valve', null, 'esp-surge-valve', null, null),
  ('/esp-top-bypass-valve', null, 'esp-top-bypass-valve', null, null),
  ('/esp-vortex-desander-bypass-valve', null, 'esp-vortex-desander-bypass-valve', null, null),
  ('/esp-vortex-desander-capillar-osi', null, 'esp-vortex-desander-capillar', null, null),
  ('/esp-vortex-desander-osi', null, 'esp-vortex-desander', null, null),
  ('/esp-vortex-desander-with-swivel', null, 'esp-vortex-desander-with-swivel', null, null),
  ('/esp-vortex-regulator', null, 'esp-vortex-regulator', null, null),
  ('/osi-esp-packer-type-gas-separat', null, 'osi-esp-packer-type-gas-separat', null, null),
  ('/osi-pmm-guardian', null, 'osi-pmm-guardian', null, null),
  ('/srp-retrievable-chem-tool', null, 'srp-retrievable-chem-tool', null, null),
  ('/bumper-spring', null, 'bumper-spring', null, null),
  ('/chamber-type-gas-separator', null, 'chamber-type-gas-separator', null, null),
  ('/gforce', null, 'g-force', null, null),
  ('/g-forcepackerless', null, 'g-forcepackerless', null, null),
  ('/gas-shield-osi', null, 'gas-shield', null, null),
  ('/gas-vent-tac', null, 'gas-vent-tac', null, null),
  ('/osi-top-bypass-valve', null, 'osi-top-bypass-valve', null, null),
  ('/packer-type-gas-separator-osi', null, 'packer-type-gas-separator', null, null),
  ('/quick-release', null, 'quick-release', null, null),
  ('/slotted-gas-shield', null, 'slotted-gas-shield', null, null),
  ('/slotted-gas-shield-gas-vent', null, 'slotted-gas-shield-gas-vent', null, null),
  ('/surge-valve-packer-type-gas-separat', null, 'surge-valve-packer-type-gas-separat', null, null),
  ('/the-nozzle', null, 'the-nozzle', null, null),
  ('/hot-oil-tool', null, 'hot-oil-tool', null, null),
  ('/osi-mesh', null, 'osi-mesh', null, null),
  ('/pump-guard-screen-osi', null, 'pump-guard-screen', null, null),
  ('/sandreleasevalve', null, 'sandreleasevalve', null, null),
  ('/screen-vortex-desander-osi', null, 'screen-vortex-desander', null, null),
  ('/super-perf', null, 'super-perf', null, null),
  ('/tubing-screen', null, 'tubing-screen', null, null),
  ('/vortex-desander-osi', null, 'vortex-desander', null, null),
  ('/well-shock-kits-osi', null, 'well-shock-kits', null, null),
  ('/chem-filter-tool', null, 'chem-filter-tool', null, null),
  ('/chem-screen', null, 'chem-screen', null, null),
  ('/chem-sticks', null, 'chem-sticks', null, null),
  ('/chemicalinjectionmandrel', null, 'chemicalinjectionmandrel', null, null),
  ('/combination-tool', null, 'combination-tool', null, null),
  ('/osi-chem-screen-gas-lift', null, 'osi-chem-screen-gas-lift', null, null),
  ('/retrievable-chem-tool', null, 'retrievable-chem-tool', null, null),
  ('/super-lube', null, 'super-lube', null, null),
  ('/employee-survey-osi', null, null, 'employee-survey', '/news'),
  ('/esp-workshop-2026', null, null, 'esp-workshop-2026', '/news'),
  ('/form-sales-team-oil-show', null, null, 'form-sales-team-oil-show', '/news'),
  ('/oil-show-visitor', null, null, 'oil-show-visitor', '/news'),
  ('/oil-show-visitor-1', null, null, 'oil-show-visitor', '/news'),
  ('/osi-at-alf', null, null, 'osi-at-alf', '/news'),
  ('/osihappyhour', null, null, 'osihappyhour', '/news'),
  ('/osi-hh-alce', null, null, 'osi-hh-alce', '/news'),
  ('/osi-lunch-and-learn', null, null, 'osi-lunch-and-learn', '/news'),
  ('/reciclaje', null, null, 'reciclaje', '/news'),
  ('/spe-alce', null, null, 'spe-alce', '/news'),
  ('/swpsc-oil-show', null, null, 'swpsc-oil-show', '/news'),
  ('/training', null, null, 'training', '/news'),
  ('/training-vid-1', null, null, 'training-vid-1', '/news'),
  ('/training-vid-2', null, null, 'training-vid-2', '/news'),
  ('/webinars', null, null, 'webinars', '/news'),
  ('/workshop-brazil', null, null, 'workshop-brazil', '/news'),
  ('/calc', '/', null, null, null),
  ('/one-min-mgnr', null, null, 'one-minute-manager', '/news'),
  ('/osi-top-intake-bypass', null, 'osi-top-intake-bypass', null, null),
  ('/new-page', '/', null, null, null)
) as v (from_path, to_path, product_slug, page_slug, fallback_path)
left join public.products p on p.slug = v.product_slug and p.locale = 'en'
left join public.pages pg on pg.slug = v.page_slug and pg.locale = 'en'
on conflict (from_path) do nothing;

do $$
declare unresolved text;
begin
  select string_agg(r.from_path, ', ') into unresolved
  from public.redirects r
  where r.note = 'Pending OSI confirmation'
    and num_nonnulls(r.to_path, r.target_product_id, r.target_page_id) = 0;
  if unresolved is not null then
    raise exception 'Redirect targets did not resolve for: %', unresolved;
  end if;
end $$;
