-- Storage and access rules for the business-claim workflow.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-claim-proofs',
  'business-claim-proofs',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists business_claim_proofs_insert_own_folder on storage.objects;
create policy business_claim_proofs_insert_own_folder
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'business-claim-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists business_claim_proofs_select_own_or_admin on storage.objects;
create policy business_claim_proofs_select_own_or_admin
on storage.objects for select
to authenticated
using (
  bucket_id = 'business-claim-proofs'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

drop policy if exists business_claim_proofs_update_own_or_admin on storage.objects;
create policy business_claim_proofs_update_own_or_admin
on storage.objects for update
to authenticated
using (
  bucket_id = 'business-claim-proofs'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
)
with check (
  bucket_id = 'business-claim-proofs'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

drop policy if exists business_claim_proofs_delete_own_or_admin on storage.objects;
create policy business_claim_proofs_delete_own_or_admin
on storage.objects for delete
to authenticated
using (
  bucket_id = 'business-claim-proofs'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

drop policy if exists business_claims_insert_own on public.business_claims;
create policy business_claims_insert_own
on public.business_claims for insert
to authenticated
with check (
  claimant_id = auth.uid()
  and status = 'pending'
  and rejection_reason is null
  and reviewed_by is null
  and reviewed_at is null
  and split_part(proof_storage_path, '/', 1) = auth.uid()::text
  and exists (
    select 1 from public.places p
    where p.id = place_id and p.publication_status = 'approved'
  )
);

drop policy if exists places_admin_update on public.places;
create policy places_admin_update
on public.places for update
to authenticated
using (public.is_admin() or public.is_place_manager(id))
with check (public.is_admin() or public.is_place_manager(id));

grant update on public.places to authenticated;
grant insert, update, delete on public.place_hours, public.place_photos to authenticated;
