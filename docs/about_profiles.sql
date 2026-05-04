-- Run this once in your Supabase SQL Editor to enable live editable About pages.

create table if not exists public.about_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Tom',
  headline text not null default 'I build cool websites like this one.',
  contact_label text not null default 'Contact me',
  contact_url text not null default '#',
  about_intro text not null default 'My passion is building cool stuff.',
  about_body text not null default 'I build primarily with React, Tailwind CSS, and Framer Motion.',
  location_label text not null default 'Cyberspace',
  mailing_title text not null default 'Join my mailing list',
  mailing_cta text not null default 'Join the list',
  avatar_url text not null default 'https://api.dicebear.com/8.x/lorelei-neutral/svg?seed=John',
  youtube_url text not null default '#',
  github_url text not null default '#',
  tiktok_url text not null default '#',
  x_url text not null default '#',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_about_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_about_profiles_updated_at on public.about_profiles;
create trigger trg_about_profiles_updated_at
before update on public.about_profiles
for each row
execute function public.touch_about_profiles_updated_at();

alter table public.about_profiles enable row level security;

drop policy if exists "about_profiles_select_own" on public.about_profiles;
create policy "about_profiles_select_own"
on public.about_profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "about_profiles_insert_own" on public.about_profiles;
create policy "about_profiles_insert_own"
on public.about_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "about_profiles_update_own" on public.about_profiles;
create policy "about_profiles_update_own"
on public.about_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.get_public_about_profile(target_user uuid)
returns table (
  user_id uuid,
  display_name text,
  headline text,
  contact_label text,
  contact_url text,
  about_intro text,
  about_body text,
  location_label text,
  mailing_title text,
  mailing_cta text,
  avatar_url text,
  youtube_url text,
  github_url text,
  tiktok_url text,
  x_url text
)
language sql
security definer
set search_path = public, auth
as $$
  select
    u.id as user_id,
    coalesce(
      nullif(ap.display_name, ''),
      nullif(u.raw_user_meta_data ->> 'full_name', ''),
      nullif(u.raw_user_meta_data ->> 'name', ''),
      split_part(coalesce(u.email, ''), '@', 1),
      'WebSong User'
    ) as display_name,
    coalesce(nullif(ap.headline, ''), 'Who you are ?') as headline,
    coalesce(nullif(ap.contact_label, ''), 'Contact me') as contact_label,
    coalesce(nullif(ap.contact_url, ''), '#') as contact_url,
    coalesce(nullif(ap.about_intro, ''), 'Describe You !') as about_intro,
    coalesce(nullif(ap.about_body, ''), '') as about_body,
    coalesce(nullif(ap.location_label, ''), 'put your location here') as location_label,
    coalesce(nullif(ap.mailing_title, ''), 'Join my mailing list') as mailing_title,
    coalesce(nullif(ap.mailing_cta, ''), 'Join the list') as mailing_cta,
    coalesce(
      nullif(ap.avatar_url, ''),
      nullif(u.raw_user_meta_data ->> 'avatar_url', ''),
      nullif(u.raw_user_meta_data ->> 'picture', ''),
      'https://api.dicebear.com/8.x/lorelei-neutral/svg?seed=' || substring(u.id::text from 1 for 12)
    ) as avatar_url,
    coalesce(nullif(ap.youtube_url, ''), '#') as youtube_url,
    coalesce(nullif(ap.github_url, ''), '#') as github_url,
    coalesce(nullif(ap.tiktok_url, ''), '#') as tiktok_url,
    coalesce(nullif(ap.x_url, ''), '#') as x_url
  from auth.users u
  join public.published_profiles pp on pp.user_id = u.id
  left join public.about_profiles ap on ap.user_id = u.id
  where u.id = target_user
  limit 1;
$$;

grant execute on function public.get_public_about_profile(uuid) to anon, authenticated;

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'about_profiles'
  ) then
    alter publication supabase_realtime add table public.about_profiles;
  end if;
end;
$$;
