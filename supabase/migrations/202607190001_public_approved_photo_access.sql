-- Ensure approved place photos can be signed for visitors without exposing
-- pending or private contribution photos.

drop policy if exists submission_photos_storage_select_owner_admin_or_public
on storage.objects;

create policy submission_photos_storage_select_owner_admin_or_public
on storage.objects for select
to anon, authenticated
using (
  bucket_id = 'place-submission-photos'
  and (
    exists (
      select 1
      from public.place_photos pp
      join public.places p on p.id = pp.place_id
      where pp.storage_path = name
        and pp.publication_status = 'approved'
        and p.publication_status = 'approved'
    )
    or (
      auth.uid() is not null
      and (
        public.is_admin()
        or (storage.foldername(name))[1] = auth.uid()::text
        or exists (
          select 1
          from public.place_submission_photos sp
          join public.place_submissions s on s.id = sp.submission_id
          where sp.storage_path = name
            and s.submitted_by = auth.uid()
        )
      )
    )
  )
);
