-- Production hardening for duplicate reports, basic abuse limits, and review integrity.

-- A user may submit another report for the same entity after the current one
-- has been resolved, but two pending reports from the same user are redundant.
create unique index if not exists content_reports_one_pending_per_reporter_entity
on public.content_reports (reported_by, entity_type, entity_id)
where status = 'pending';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'content_reports_details_length'
      and conrelid = 'public.content_reports'::regclass
  ) then
    alter table public.content_reports
      add constraint content_reports_details_length
      check (details is null or char_length(details) <= 1000);
  end if;
end $$;

-- Limit new place submissions to five per account in a rolling 24-hour window.
-- The timestamp is assigned by the database so a client cannot bypass the
-- limit by sending an artificial created_at value.
create or replace function public.enforce_place_submission_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
begin
  new.created_at := now();
  new.updated_at := now();

  select count(*)
  into recent_count
  from public.place_submissions
  where submitted_by = new.submitted_by
    and created_at >= now() - interval '24 hours';

  if recent_count >= 5 then
    raise exception using
      errcode = 'P0001',
      message = 'Batas usulan harian tercapai. Coba lagi setelah 24 jam.';
  end if;

  return new;
end;
$$;

drop trigger if exists place_submissions_rate_limit on public.place_submissions;
create trigger place_submissions_rate_limit
before insert on public.place_submissions
for each row execute function public.enforce_place_submission_rate_limit();

-- Keep report creation timestamps server-controlled and limit burst reporting.
create or replace function public.enforce_content_report_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
begin
  new.created_at := now();
  new.updated_at := now();

  select count(*)
  into recent_count
  from public.content_reports
  where reported_by = new.reported_by
    and created_at >= now() - interval '24 hours';

  if recent_count >= 30 then
    raise exception using
      errcode = 'P0001',
      message = 'Batas laporan harian tercapai. Coba lagi setelah 24 jam.';
  end if;

  return new;
end;
$$;

drop trigger if exists content_reports_rate_limit on public.content_reports;
create trigger content_reports_rate_limit
before insert on public.content_reports
for each row execute function public.enforce_content_report_rate_limit();

-- A contributor may edit the text/rating of their own review while pending,
-- but cannot move it to another place or impersonate another user.
create or replace function public.prevent_review_identity_change()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_admin() then
    if new.user_id <> old.user_id or new.place_id <> old.place_id then
      raise exception using
        errcode = 'P0001',
        message = 'Identitas pemilik dan tempat pada ulasan tidak dapat diubah.';
    end if;
    new.created_at := old.created_at;
  end if;

  return new;
end;
$$;

drop trigger if exists reviews_prevent_identity_change on public.reviews;
create trigger reviews_prevent_identity_change
before update on public.reviews
for each row execute function public.prevent_review_identity_change();

drop policy if exists reviews_update_own_or_admin on public.reviews;
create policy reviews_update_own_or_admin
on public.reviews for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (
  public.is_admin()
  or (
    user_id = auth.uid()
    and status = 'pending'
    and moderation_reason is null
    and moderated_by is null
    and moderated_at is null
  )
);

-- User-created content always receives server timestamps, even when a client
-- sends its own created_at value.
create or replace function public.set_user_created_timestamps()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.created_at := now();
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists reviews_user_created_timestamps on public.reviews;
create trigger reviews_user_created_timestamps
before insert on public.reviews
for each row execute function public.set_user_created_timestamps();

drop trigger if exists business_claims_user_created_timestamps on public.business_claims;
create trigger business_claims_user_created_timestamps
before insert on public.business_claims
for each row execute function public.set_user_created_timestamps();

drop policy if exists content_reports_insert_own on public.content_reports;
create policy content_reports_insert_own
on public.content_reports for insert
to authenticated
with check (
  reported_by = auth.uid()
  and status = 'pending'
  and reviewed_by is null
  and reviewed_at is null
);
