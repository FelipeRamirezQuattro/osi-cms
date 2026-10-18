-- Convert the existing redirects that pointed at a typed product URL into product references, so they
-- survive a publish, a slug change or a category change (two of them already led to a 404: the target
-- product was a draft, or sat in a different category than the typed URL).
-- Supersedes 0051's /esp-chem-screen-osi path fix (it now resolves to the product's real URL).
update public.redirects r
set target_product_id = p.id, to_path = null, updated_at = now()
from (values
  ('/copy-of-g-force',          'esp-g-force'),
  ('/osi-esp-guardian-shield',  'g-force-esp-packer-type-gas-separator'),
  ('/gasreleasesystem',         'gas-release-system'),
  ('/srp-sand-lift',            'srp-sand-lift'),
  ('/esp-chem-screen-osi',      'esp-chem-screen')
) as m (from_path, product_slug)
join public.products p on p.slug = m.product_slug and p.locale = 'en'
where r.from_path = m.from_path;
