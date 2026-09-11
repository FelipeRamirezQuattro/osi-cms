-- Storage bucket for admin-uploaded media (new content only — legacy
-- images stay on the legacy host per CLAUDE.md constraint 3). This is
-- the "storage glue" exception in constraint 2.
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "public can read media bucket"
  on storage.objects for select
  using (bucket_id = 'media');

create policy "staff can upload to media bucket"
  on storage.objects for insert
  with check (bucket_id = 'media' and public.is_staff());

create policy "staff can update media bucket"
  on storage.objects for update
  using (bucket_id = 'media' and public.is_staff())
  with check (bucket_id = 'media' and public.is_staff());

create policy "staff can delete from media bucket"
  on storage.objects for delete
  using (bucket_id = 'media' and public.is_staff());
