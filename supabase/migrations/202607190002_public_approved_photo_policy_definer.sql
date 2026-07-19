-- Make the public approved-photo check independent from nested RLS
-- evaluation while keeping the contribution bucket private.

create or replace function public.can_view_approved_place_photo(target_storage_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.place_photos pp
    join public.places p on p.id = pp.place_id
    where pp.storage_path = target_storage_path
      and pp.publication_status = 'approved'
      and p.publication_status = 'approved'
  );
$$;

revoke all on function public.can_view_approved_place_photo(text) from public;
grant execute on function public.can_view_approved_place_photo(text) to anon, authenticated;

drop policy if exists submission_photos_storage_select_owner_admin_or_public
on storage.objects;

create policy submission_photos_storage_select_owner_admin_or_public
on storage.objects for select
to anon, authenticated
using (
  bucket_id = 'place-submission-photos'
  and (
    public.can_view_approved_place_photo(name)
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
