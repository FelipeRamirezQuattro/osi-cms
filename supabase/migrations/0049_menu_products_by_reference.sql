-- Data pass that goes with 0048 (approved by the client contact, Oct 18):
--  1. "Menu column wins": products the mega menu lists under a column move to
--     that column's category, so the product's real URL matches where the menu
--     shows it. Only the 9 products named below — nothing else is recategorised.
--  2. Link every mega-menu product item to its product (labels unchanged).
--  3. Legacy redirect /osi-esp-guardian-shield -> the G-Force ESP packer-type
--     gas separator (kept in chemical-treatment until OSI confirms).
--  4. A "Products" entry in the utility bar (the mockup's top bar has one);
--     the header opens the products menu from it (components/layout/mega-menu-client.tsx).
-- All statements are idempotent.

-- 1. Categories ---------------------------------------------------------------
update public.products p
set category_id = c.id
from public.product_categories c
join (values
  ('esp-guardian-shield',             'gas-separation'),
  ('esp-vortex-regulator',            'gas-separation'),
  ('osi-esp-packer-type-gas-separat', 'gas-separation'),
  ('esp-surge-valve',                 'gas-separation'),
  ('chemicalinjectionmandrel',        'pumps'),
  ('well-shock-kits',                 'pumps'),
  ('osi-top-bypass-valve',            'sand-control'),
  ('the-nozzle',                      'sand-control'),
  ('osi-top-intake-bypass',           'sand-control')
) as m (product_slug, category_slug) on c.slug = m.category_slug
where p.slug = m.product_slug
  and p.locale = 'en'
  and p.category_id is distinct from c.id;

-- 2. Menu items -> products (matched on the mega-menu item label) --------------
update public.nav_items n
set product_id = p.id
from public.nav_menus nm,
     (values
  ('SRP Sand Lift',                  'srp-sand-lift'),
  ('Screen Vortex Desander',         'screen-vortex-desander'),
  ('Sand Release Valves',            'sandreleasevalve'),
  ('Top Bypass Valve',               'osi-top-bypass-valve'),
  ('Pump Guard Screen',              'pump-guard-screen'),
  ('Dip Tube Bypass',                'osi-top-intake-bypass'),
  ('Super Perf',                     'super-perf'),
  ('Tubing Screen',                  'tubing-screen'),
  ('Vortex Desander',                'vortex-desander'),
  ('The Nozzle',                     'the-nozzle'),
  ('ESP Guard Shield',               'esp-guardian-shield'),
  ('ESP Vortex Regulator',           'esp-vortex-regulator'),
  ('ESP Tracker Type Gas Separator', 'osi-esp-packer-type-gas-separat'),
  ('ESP Surge Valve',                'esp-surge-valve'),
  ('ESP G-Force',                    'esp-g-force'),
  ('Gas Release System',             'gas-release-system'),
  ('Chemical Injection Mandrel',     'chemicalinjectionmandrel'),
  ('ESP Chem Screen',                'esp-chem-screen'),
  ('Well Shockstick',                'well-shock-kits')
) as m (item_label, product_slug)
join public.products p on p.slug = m.product_slug and p.locale = 'en'
where nm.key = 'mega'
  and n.menu_id = nm.id
  and n.parent_id is not null
  and n.label = m.item_label;

-- Keep the stored fallback href equal to the product's real URL (admin display
-- and link audit); products without a category keep their old href.
update public.nav_items n
set href = '/products/' || c.slug || '/' || p.slug
from public.products p
join public.product_categories c on c.id = p.category_id
where n.product_id = p.id
  and n.href is distinct from '/products/' || c.slug || '/' || p.slug;

-- 3. Legacy redirect ------------------------------------------------------------
insert into public.redirects (from_path, to_path, status_code)
values ('/osi-esp-guardian-shield', '/products/chemical-treatment/g-force-esp-packer-type-gas-separator', 301)
on conflict (from_path) do nothing;

-- 4. Utility "Products" entry -----------------------------------------------------
insert into public.nav_items (menu_id, label, href, position)
select nm.id, 'Products', '/products', 10
from public.nav_menus nm
where nm.key = 'utility'
  and not exists (select 1 from public.nav_items i where i.menu_id = nm.id and i.href = '/products');
