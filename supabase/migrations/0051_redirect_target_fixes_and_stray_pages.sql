-- Data fixes approved by the client contact (Oct 18), alongside server-side redirects:
--  1. /esp-chem-screen-osi pointed at /products/chemical-treatment/esp-chem-screen, but that
--     product lives in the "pumps" category, so the target 404'd. Point it at the real URL.
--  2. /osi-directory (-> /directory, an archived page) and /Osidirectory (-> /directory-1, which
--     doesn't exist) both 404'd. Send both to /contact until OSI confirms a final target.
--  3. Unpublish two leftover test pages that are visible to search engines: "page-1" and
--     "george/hj-df" (both created and published by the admin account — see audit_log). They go
--     back to draft; nothing is deleted. Mirrors unpublish_page_atomic, minus its capability
--     check (a migration has no session), and writes the audit rows itself.
-- Idempotent.

update public.redirects set to_path = '/products/pumps/esp-chem-screen', updated_at = now()
where from_path = '/esp-chem-screen-osi' and to_path <> '/products/pumps/esp-chem-screen';

update public.redirects set to_path = '/contact', updated_at = now()
where from_path in ('/osi-directory', '/Osidirectory') and to_path <> '/contact';

with stray as (
  select id from public.pages where slug in ('page-1', 'george/hj-df') and status = 'published'
), gone as (
  delete from public.page_publications where page_id in (select id from stray) returning page_id
), updated as (
  update public.pages set status = 'draft', published_at = null
  where id in (select id from stray)
  returning id
)
insert into public.audit_log (actor_id, action, entity, entity_id, diff)
select null, 'unpublish', 'page', id, jsonb_build_object('reason', 'migration 0051: leftover test page')
from updated;
