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
