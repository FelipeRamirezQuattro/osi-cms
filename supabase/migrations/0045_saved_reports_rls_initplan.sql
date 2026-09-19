-- Same policy as 0041, with auth.uid() wrapped in a scalar subquery so
-- Postgres evaluates it once per query instead of once per row (Supabase
-- performance advisor 0003_auth_rls_initplan). Behavior is unchanged: a
-- staff member can read and write only their own saved reports.
drop policy "staff manage their own saved reports" on admin_saved_reports;

create policy "staff manage their own saved reports"
  on admin_saved_reports for all
  using (user_id = (select auth.uid()) and public.is_staff())
  with check (user_id = (select auth.uid()) and public.is_staff());
