-- Advisor fix: set_updated_at() had a mutable search_path.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- is_staff()/is_admin() are intentionally callable by anon/authenticated
-- (the advisor flags this) — RLS policies evaluate as the connecting
-- role, so revoking EXECUTE would break every policy that calls them.
-- They only ever report on the calling user's own admin_profiles row.
