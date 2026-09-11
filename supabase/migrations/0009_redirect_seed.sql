-- Legacy URL redirect map from the master prompt §7. `/oxy` and
-- `/osi-internal` are excluded — the prompt flags them "confirm with
-- client (currently empty pages)" and confirmed empty in the scrape
-- (see docs/CONTENT-GAPS.md); redirecting them anywhere would be a
-- guess.
-- '/services-4' (legacy "Customer Cloud" page) target is provisional:
-- master prompt open question #2 asks whether Customer Cloud stays an
-- external link or becomes an in-app section. Pointed at /services for
-- now; revisit once that's answered.
insert into redirects (from_path, to_path, status_code) values
  ('/services-4', '/services', 301),
  ('/osi-directory', '/directory', 301),
  ('/certifications', '/hse', 301),
  ('/general-8', '/services/fluid-levels', 301),
  ('/copia-de-fluid-levels', '/services/pump-cards', 301),
  ('/gasreleasesystem', '/products/gas-separation/gas-release-system', 301),
  ('/esp-chem-screen-osi', '/products/chemical-treatment/esp-chem-screen', 301),
  ('/srp-sand-lift', '/products/sand-control/srp-sand-lift', 301),
  ('/sg-sst-policies', '/hse/sg-sst-policies', 301),
  ('/machine-shop', '/services/machine-shop', 301),
  ('/hiring', '/careers/hiring', 301);
