-- Kuliner Tersembunyi
-- Initial schema for the Bandung MVP.
-- Run with Supabase CLI (`supabase db push`) or paste into the SQL Editor.

create extension if not exists pgcrypto;

do $$
begin
  create type public.app_role as enum ('user', 'owner', 'admin');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.place_category as enum ('makanan', 'minuman');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.price_range as enum ('murah', 'sedang', 'mahal', 'tidak_diketahui');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.halal_status as enum ('halal', 'non_halal', 'belum_terverifikasi');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.publication_status as enum ('pending', 'approved', 'rejected', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.moderation_action as enum ('approve', 'reject', 'edit', 'archive', 'restore', 'delete');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.report_reason as enum ('spam', 'informasi_salah', 'konten_menyinggung', 'tempat_tutup', 'lainnya');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.report_status as enum ('pending', 'ignored', 'actioned');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.claim_status as enum ('pending', 'approved', 'rejected');
exception
  when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- A new auth user receives a safe default profile. The role is deliberately
-- not read from user metadata so a client cannot register as an admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(new.email, '@', 1)
    ),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Core public directory. Only rows with publication_status = approved are
-- visible through the public read policy.
create table public.places (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  category public.place_category not null,
  price_range public.price_range not null default 'tidak_diketahui',
  halal_status public.halal_status not null default 'belum_terverifikasi',
  description text,
  address text not null check (char_length(btrim(address)) between 5 and 240),
  area text,
  latitude numeric(9, 6) not null check (latitude between -90 and 90),
  longitude numeric(9, 6) not null check (longitude between -180 and 180),
  phone text,
  website_url text,
  instagram_url text,
  timezone text not null default 'Asia/Jakarta',
  publication_status public.publication_status not null default 'approved',
  is_featured boolean not null default false,
  rating numeric(2, 1) not null default 0 check (rating between 0 and 5),
  review_count integer not null default 0 check (review_count >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger places_set_updated_at
before update on public.places
for each row execute function public.set_updated_at();

create index places_public_listing_idx
on public.places (publication_status, category, price_range, halal_status);

create index places_location_idx
on public.places (latitude, longitude);

create index places_search_idx
on public.places
using gin (
  to_tsvector(
    'simple',
    coalesce(name, '') || ' ' ||
    coalesce(address, '') || ' ' ||
    coalesce(area, '') || ' ' ||
    coalesce(description, '')
  )
);

-- One row for each day. day_of_week follows PostgreSQL's convention:
-- 0 = Sunday, 1 = Monday, ... 6 = Saturday.
create table public.place_hours (
  place_id uuid not null references public.places(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  is_closed boolean not null default false,
  is_24_hours boolean not null default false,
  open_time time,
  close_time time,
  updated_at timestamptz not null default now(),
  primary key (place_id, day_of_week),
  constraint place_hours_valid_state check (
    (is_closed = true and is_24_hours = false and open_time is null and close_time is null)
    or
    (is_closed = false and is_24_hours = true and open_time is null and close_time is null)
    or
    (is_closed = false and is_24_hours = false and open_time is not null and close_time is not null)
  )
);

create trigger place_hours_set_updated_at
before update on public.place_hours
for each row execute function public.set_updated_at();

create table public.place_photos (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  storage_path text not null,
  caption text,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_cover boolean not null default false,
  publication_status public.publication_status not null default 'approved',
  uploaded_by uuid references public.profiles(id) on delete set null,
  moderated_by uuid references public.profiles(id) on delete set null,
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger place_photos_set_updated_at
before update on public.place_photos
for each row execute function public.set_updated_at();

create index place_photos_listing_idx
on public.place_photos (place_id, publication_status, sort_order);

-- A user can save a place only once. The primary key also prevents duplicate
-- favorites if the button is clicked repeatedly.
create table public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(btrim(body)) between 3 and 2000),
  status public.publication_status not null default 'pending',
  moderation_reason text,
  moderated_by uuid references public.profiles(id) on delete set null,
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger reviews_set_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

-- Rejected/archived reviews do not block a new contribution, but a user can
-- have only one active review (pending or approved) for one place.
create unique index reviews_one_active_per_user_place
on public.reviews (user_id, place_id)
where status in ('pending', 'approved');

create index reviews_public_listing_idx
on public.reviews (place_id, status, created_at desc);

create or replace function public.refresh_place_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_place_id uuid;
begin
  if tg_op = 'DELETE' then
    affected_place_id := old.place_id;
  else
    affected_place_id := new.place_id;
  end if;

  update public.places
  set
    rating = coalesce((
      select round(avg(r.rating)::numeric, 1)
      from public.reviews r
      where r.place_id = affected_place_id
        and r.status = 'approved'
    ), 0),
    review_count = (
      select count(*)
      from public.reviews r
      where r.place_id = affected_place_id
        and r.status = 'approved'
    )
  where id = affected_place_id;

  if tg_op = 'UPDATE' and old.place_id is distinct from new.place_id then
    update public.places
    set
      rating = coalesce((
        select round(avg(r.rating)::numeric, 1)
        from public.reviews r
        where r.place_id = old.place_id
          and r.status = 'approved'
      ), 0),
      review_count = (
        select count(*)
        from public.reviews r
        where r.place_id = old.place_id
          and r.status = 'approved'
      )
    where id = old.place_id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger reviews_refresh_place_rating
after insert or update or delete on public.reviews
for each row execute function public.refresh_place_rating();

-- User-submitted places remain separate from the public directory until an
-- admin approves them and creates/updates a row in places.
create table public.place_submissions (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  category public.place_category not null,
  price_range public.price_range not null default 'tidak_diketahui',
  halal_status public.halal_status not null default 'belum_terverifikasi',
  description text,
  address text not null check (char_length(btrim(address)) between 5 and 240),
  area text,
  latitude numeric(9, 6) not null check (latitude between -90 and 90),
  longitude numeric(9, 6) not null check (longitude between -180 and 180),
  phone text,
  website_url text,
  instagram_url text,
  status public.publication_status not null default 'pending',
  rejection_reason text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  approved_place_id uuid references public.places(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint place_submissions_rejection_reason check (
    status <> 'rejected' or nullif(btrim(rejection_reason), '') is not null
  )
);

create trigger place_submissions_set_updated_at
before update on public.place_submissions
for each row execute function public.set_updated_at();

create index place_submissions_owner_idx
on public.place_submissions (submitted_by, created_at desc);

create index place_submissions_moderation_idx
on public.place_submissions (status, created_at desc);

create table public.place_submission_hours (
  submission_id uuid not null references public.place_submissions(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  is_closed boolean not null default false,
  is_24_hours boolean not null default false,
  open_time time,
  close_time time,
  updated_at timestamptz not null default now(),
  primary key (submission_id, day_of_week),
  constraint submission_hours_valid_state check (
    (is_closed = true and is_24_hours = false and open_time is null and close_time is null)
    or
    (is_closed = false and is_24_hours = true and open_time is null and close_time is null)
    or
    (is_closed = false and is_24_hours = false and open_time is not null and close_time is not null)
  )
);

create trigger place_submission_hours_set_updated_at
before update on public.place_submission_hours
for each row execute function public.set_updated_at();

create table public.place_submission_photos (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.place_submissions(id) on delete cascade,
  storage_path text not null,
  caption text,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now()
);

create index place_submission_photos_owner_idx
on public.place_submission_photos (submission_id, sort_order);

create table public.moderation_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  entity_type text not null check (entity_type in ('place', 'review', 'place_submission', 'place_photo', 'report', 'business_claim')),
  entity_id uuid not null,
  action public.moderation_action not null,
  from_status text,
  to_status text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index moderation_logs_entity_idx
on public.moderation_logs (entity_type, entity_id, created_at desc);

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reported_by uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null check (entity_type in ('place', 'review', 'place_photo')),
  entity_id uuid not null,
  reason public.report_reason not null,
  details text,
  status public.report_status not null default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger content_reports_set_updated_at
before update on public.content_reports
for each row execute function public.set_updated_at();

create index content_reports_moderation_idx
on public.content_reports (status, created_at desc);

create table public.business_claims (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  claimant_id uuid not null references public.profiles(id) on delete cascade,
  contact_name text not null,
  contact_phone text not null,
  contact_email text,
  proof_storage_path text not null,
  notes text,
  status public.claim_status not null default 'pending',
  rejection_reason text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_claims_rejection_reason check (
    status <> 'rejected' or nullif(btrim(rejection_reason), '') is not null
  )
);

create trigger business_claims_set_updated_at
before update on public.business_claims
for each row execute function public.set_updated_at();

create unique index business_claims_one_pending_per_claimant
on public.business_claims (place_id, claimant_id)
where status = 'pending';

create index business_claims_moderation_idx
on public.business_claims (status, created_at desc);

create table public.place_managers (
  place_id uuid not null references public.places(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  claim_id uuid not null unique references public.business_claims(id) on delete restrict,
  granted_at timestamptz not null default now(),
  granted_by uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz,
  primary key (place_id, user_id)
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.is_place_manager(target_place_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.place_managers
    where place_id = target_place_id
      and user_id = auth.uid()
      and revoked_at is null
  );
$$;

create or replace function public.sync_approved_business_claim()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'approved' then
      insert into public.place_managers (place_id, user_id, claim_id, granted_by)
      values (new.place_id, new.claimant_id, new.id, new.reviewed_by)
      on conflict (place_id, user_id) do update
      set claim_id = excluded.claim_id,
          granted_by = excluded.granted_by,
          revoked_at = null;

      update public.profiles
      set role = 'owner'
      where id = new.claimant_id
        and role = 'user';
    end if;
  elsif tg_op = 'UPDATE' and new.status = 'approved' and old.status is distinct from 'approved' then
    insert into public.place_managers (place_id, user_id, claim_id, granted_by)
    values (new.place_id, new.claimant_id, new.id, new.reviewed_by)
    on conflict (place_id, user_id) do update
    set claim_id = excluded.claim_id,
        granted_by = excluded.granted_by,
        revoked_at = null;

    update public.profiles
    set role = 'owner'
    where id = new.claimant_id
      and role = 'user';
  end if;

  return new;
end;
$$;

create trigger business_claims_sync_manager
after insert or update on public.business_claims
for each row execute function public.sync_approved_business_claim();

-- RLS is enabled on every application table. The public can read only
-- approved directory content; all contribution and moderation tables require
-- an authenticated user.
alter table public.profiles enable row level security;
alter table public.places enable row level security;
alter table public.place_hours enable row level security;
alter table public.place_photos enable row level security;
alter table public.favorites enable row level security;
alter table public.reviews enable row level security;
alter table public.place_submissions enable row level security;
alter table public.place_submission_hours enable row level security;
alter table public.place_submission_photos enable row level security;
alter table public.moderation_logs enable row level security;
alter table public.content_reports enable row level security;
alter table public.business_claims enable row level security;
alter table public.place_managers enable row level security;

-- Profiles
create policy profiles_select_own_or_admin
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy profiles_update_own
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Places and related public directory data
create policy places_select_public_or_admin_or_manager
on public.places for select
to anon, authenticated
using (
  publication_status = 'approved'
  or public.is_admin()
  or public.is_place_manager(id)
);

create policy places_admin_insert
on public.places for insert
to authenticated
with check (public.is_admin());

create policy places_admin_update
on public.places for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy places_admin_delete
on public.places for delete
to authenticated
using (public.is_admin());

create policy place_hours_select_public_or_admin_or_manager
on public.place_hours for select
to anon, authenticated
using (
  exists (
    select 1 from public.places p
    where p.id = place_id
      and (
        p.publication_status = 'approved'
        or public.is_admin()
        or public.is_place_manager(p.id)
      )
  )
);

create policy place_hours_admin_or_manager_insert
on public.place_hours for insert
to authenticated
with check (public.is_admin() or public.is_place_manager(place_id));

create policy place_hours_admin_or_manager_update
on public.place_hours for update
to authenticated
using (public.is_admin() or public.is_place_manager(place_id))
with check (public.is_admin() or public.is_place_manager(place_id));

create policy place_hours_admin_or_manager_delete
on public.place_hours for delete
to authenticated
using (public.is_admin() or public.is_place_manager(place_id));

create policy place_photos_select_public_or_admin_or_manager
on public.place_photos for select
to anon, authenticated
using (
  (
    publication_status = 'approved'
    and exists (
      select 1 from public.places p
      where p.id = place_id and p.publication_status = 'approved'
    )
  )
  or public.is_admin()
  or public.is_place_manager(place_id)
);

create policy place_photos_admin_or_manager_insert
on public.place_photos for insert
to authenticated
with check (public.is_admin() or public.is_place_manager(place_id));

create policy place_photos_admin_or_manager_update
on public.place_photos for update
to authenticated
using (public.is_admin() or public.is_place_manager(place_id))
with check (public.is_admin() or public.is_place_manager(place_id));

create policy place_photos_admin_or_manager_delete
on public.place_photos for delete
to authenticated
using (public.is_admin() or public.is_place_manager(place_id));

-- Favorites
create policy favorites_select_own_or_admin
on public.favorites for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy favorites_insert_own
on public.favorites for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.places p
    where p.id = place_id and p.publication_status = 'approved'
  )
);

create policy favorites_delete_own_or_admin
on public.favorites for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

-- Reviews
create policy reviews_select_public_or_own_or_admin
on public.reviews for select
to anon, authenticated
using (status = 'approved' or user_id = auth.uid() or public.is_admin());

create policy reviews_insert_own_pending
on public.reviews for insert
to authenticated
with check (
  user_id = auth.uid()
  and status = 'pending'
  and moderation_reason is null
  and moderated_by is null
  and moderated_at is null
  and exists (
    select 1 from public.places p
    where p.id = place_id and p.publication_status = 'approved'
  )
);

create policy reviews_update_own_or_admin
on public.reviews for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (
  public.is_admin()
  or (user_id = auth.uid() and status = 'pending')
);

create policy reviews_delete_own_or_admin
on public.reviews for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

-- User submissions
create policy place_submissions_select_own_or_admin
on public.place_submissions for select
to authenticated
using (submitted_by = auth.uid() or public.is_admin());

create policy place_submissions_insert_own_pending
on public.place_submissions for insert
to authenticated
with check (
  submitted_by = auth.uid()
  and status = 'pending'
  and rejection_reason is null
  and reviewed_by is null
  and reviewed_at is null
  and approved_place_id is null
);

create policy place_submissions_admin_update
on public.place_submissions for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy place_submissions_admin_delete
on public.place_submissions for delete
to authenticated
using (public.is_admin());

create policy submission_hours_select_owner_or_admin
on public.place_submission_hours for select
to authenticated
using (
  exists (
    select 1 from public.place_submissions s
    where s.id = submission_id
      and (s.submitted_by = auth.uid() or public.is_admin())
  )
);

create policy submission_hours_insert_owner_or_admin
on public.place_submission_hours for insert
to authenticated
with check (
  exists (
    select 1 from public.place_submissions s
    where s.id = submission_id
      and (s.submitted_by = auth.uid() or public.is_admin())
  )
);

create policy submission_hours_update_owner_or_admin
on public.place_submission_hours for update
to authenticated
using (
  exists (
    select 1 from public.place_submissions s
    where s.id = submission_id
      and (s.submitted_by = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1 from public.place_submissions s
    where s.id = submission_id
      and (s.submitted_by = auth.uid() or public.is_admin())
  )
);

create policy submission_hours_delete_owner_or_admin
on public.place_submission_hours for delete
to authenticated
using (
  exists (
    select 1 from public.place_submissions s
    where s.id = submission_id
      and (s.submitted_by = auth.uid() or public.is_admin())
  )
);

create policy submission_photos_select_owner_or_admin
on public.place_submission_photos for select
to authenticated
using (
  exists (
    select 1 from public.place_submissions s
    where s.id = submission_id
      and (s.submitted_by = auth.uid() or public.is_admin())
  )
);

create policy submission_photos_insert_owner_or_admin
on public.place_submission_photos for insert
to authenticated
with check (
  exists (
    select 1 from public.place_submissions s
    where s.id = submission_id
      and (s.submitted_by = auth.uid() or public.is_admin())
  )
);

create policy submission_photos_delete_owner_or_admin
on public.place_submission_photos for delete
to authenticated
using (
  exists (
    select 1 from public.place_submissions s
    where s.id = submission_id
      and (s.submitted_by = auth.uid() or public.is_admin())
  )
);

-- Moderation history is admin-only.
create policy moderation_logs_admin_only
on public.moderation_logs for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Reports
create policy content_reports_select_own_or_admin
on public.content_reports for select
to authenticated
using (reported_by = auth.uid() or public.is_admin());

create policy content_reports_insert_own
on public.content_reports for insert
to authenticated
with check (reported_by = auth.uid());

create policy content_reports_admin_update
on public.content_reports for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Business claims
create policy business_claims_select_own_or_admin
on public.business_claims for select
to authenticated
using (claimant_id = auth.uid() or public.is_admin());

create policy business_claims_insert_own
on public.business_claims for insert
to authenticated
with check (
  claimant_id = auth.uid()
  and status = 'pending'
  and rejection_reason is null
  and reviewed_by is null
  and reviewed_at is null
  and exists (
    select 1 from public.places p
    where p.id = place_id and p.publication_status = 'approved'
  )
);

create policy business_claims_admin_update
on public.business_claims for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy business_claims_admin_delete
on public.business_claims for delete
to authenticated
using (public.is_admin());

-- A verified manager can read their managed places. Only admins can grant or
-- revoke a manager record; approval of a claim inserts it automatically.
create policy place_managers_select_own_or_admin
on public.place_managers for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy place_managers_admin_insert
on public.place_managers for insert
to authenticated
with check (public.is_admin());

create policy place_managers_admin_update
on public.place_managers for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy place_managers_admin_delete
on public.place_managers for delete
to authenticated
using (public.is_admin());

-- Explicit grants keep the API surface clear. RLS remains the authority for
-- which rows each role can access.
grant usage on schema public to anon, authenticated;

grant select on public.places, public.place_hours, public.place_photos to anon, authenticated;
grant select on public.reviews to anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;

grant insert, select, delete on public.favorites to authenticated;
grant insert, select, update, delete on public.reviews to authenticated;
grant insert, select, update, delete on public.place_submissions to authenticated;
grant insert, select, update, delete on public.place_submission_hours to authenticated;
grant insert, select, delete on public.place_submission_photos to authenticated;
grant insert, select, update, delete on public.moderation_logs to authenticated;
grant insert, select, update on public.content_reports to authenticated;
grant insert, select, update, delete on public.business_claims to authenticated;
grant insert, select, update, delete on public.place_managers to authenticated;
