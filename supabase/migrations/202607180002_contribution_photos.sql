-- Contribution photos and Storage policies for the moderation workflow.
-- Run after 202607180001_initial_schema.sql.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'place-submission-photos',
  'place-submission-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- A contributor can upload only below their own top-level folder. The
-- submission row itself is still protected by the table RLS policy.
create policy submission_photos_storage_insert_own_folder
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'place-submission-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy submission_photos_storage_select_owner_admin_or_public
on storage.objects for select
to anon, authenticated
using (
  bucket_id = 'place-submission-photos'
  and (
    (
      auth.uid() is not null
      and (storage.foldername(name))[1] = auth.uid()::text
    )
    or public.is_admin()
    or exists (
      select 1
      from public.place_submission_photos sp
      join public.place_submissions s on s.id = sp.submission_id
      where sp.storage_path = name
        and s.submitted_by = auth.uid()
    )
    or exists (
      select 1
      from public.place_photos pp
      join public.places p on p.id = pp.place_id
      where pp.storage_path = name
        and pp.publication_status = 'approved'
        and p.publication_status = 'approved'
    )
  )
);

create policy submission_photos_storage_update_owner_or_admin
on storage.objects for update
to authenticated
using (
  bucket_id = 'place-submission-photos'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
)
with check (
  bucket_id = 'place-submission-photos'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

create policy submission_photos_storage_delete_owner_or_admin
on storage.objects for delete
to authenticated
using (
  bucket_id = 'place-submission-photos'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

