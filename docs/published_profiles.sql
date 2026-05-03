-- Run this once in your Supabase SQL Editor.
-- Adds publish state + a public-safe suggestions RPC for /profile-suggestions.

create table if not exists public.published_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_published_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_published_profiles_updated_at on public.published_profiles;
create trigger trg_published_profiles_updated_at
before update on public.published_profiles
for each row
execute function public.touch_published_profiles_updated_at();

alter table public.published_profiles enable row level security;

drop policy if exists "published_profiles_select_own" on public.published_profiles;
create policy "published_profiles_select_own"
on public.published_profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "published_profiles_insert_own" on public.published_profiles;
create policy "published_profiles_insert_own"
on public.published_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "published_profiles_update_own" on public.published_profiles;
create policy "published_profiles_update_own"
on public.published_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "published_profiles_delete_own" on public.published_profiles;
create policy "published_profiles_delete_own"
on public.published_profiles
for delete
to authenticated
using (auth.uid() = user_id);

create or replace function public.get_published_profile_suggestions(limit_count integer default 12)
returns table (
  user_id uuid,
  display_name text,
  headline text,
  avatar_url text
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if to_regclass('public.about_profiles') is null then
    return query
    with published as (
      select pp.user_id
      from public.published_profiles pp
      order by pp.updated_at desc
      limit greatest(1, least(limit_count, 50))
    )
    select
      u.id as user_id,
      coalesce(
        nullif(u.raw_user_meta_data ->> 'full_name', ''),
        nullif(u.raw_user_meta_data ->> 'name', ''),
        split_part(coalesce(u.email, ''), '@', 1),
        'WebSong User'
      ) as display_name,
      'Musique, recommandations et découvertes.'::text as headline,
      coalesce(
        nullif(u.raw_user_meta_data ->> 'avatar_url', ''),
        nullif(u.raw_user_meta_data ->> 'picture', ''),
        'https://api.dicebear.com/8.x/lorelei-neutral/svg?seed=' || substring(u.id::text from 1 for 12)
      ) as avatar_url
    from published p
    join auth.users u on u.id = p.user_id
    order by u.last_sign_in_at desc nulls last, u.created_at desc;
    return;
  end if;

  return query
  with published as (
    select pp.user_id
    from public.published_profiles pp
    order by pp.updated_at desc
    limit greatest(1, least(limit_count, 50))
  )
  select
    u.id as user_id,
    coalesce(
      nullif(ap.display_name, ''),
      nullif(u.raw_user_meta_data ->> 'full_name', ''),
      nullif(u.raw_user_meta_data ->> 'name', ''),
      split_part(coalesce(u.email, ''), '@', 1),
      'WebSong User'
    ) as display_name,
    coalesce(
      nullif(ap.headline, ''),
      'Musique, recommandations et découvertes.'
    ) as headline,
    coalesce(
      nullif(ap.avatar_url, ''),
      nullif(u.raw_user_meta_data ->> 'avatar_url', ''),
      nullif(u.raw_user_meta_data ->> 'picture', ''),
      'https://api.dicebear.com/8.x/lorelei-neutral/svg?seed=' || substring(u.id::text from 1 for 12)
    ) as avatar_url
  from published p
  join auth.users u on u.id = p.user_id
  left join public.about_profiles ap on ap.user_id = p.user_id
  order by u.last_sign_in_at desc nulls last, u.created_at desc;
end;
$$;

grant execute on function public.get_published_profile_suggestions(integer) to anon, authenticated;

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
      and tablename = 'published_profiles'
  ) then
    alter publication supabase_realtime add table public.published_profiles;
  end if;
end;
$$;
