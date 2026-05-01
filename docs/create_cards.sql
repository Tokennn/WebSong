-- Run this once in your Supabase SQL Editor to enable persistent custom cards on /create.

create table if not exists public.create_cards (
  user_id uuid not null references auth.users(id) on delete cascade,
  slot_index integer not null check (slot_index between 1 and 5),
  spotify_type text not null check (spotify_type in ('artist', 'album', 'track')),
  spotify_id text not null,
  title text not null,
  subtitle text not null,
  image_url text not null,
  external_url text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, slot_index)
);

create or replace function public.touch_create_cards_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_create_cards_updated_at on public.create_cards;
create trigger trg_create_cards_updated_at
before update on public.create_cards
for each row
execute function public.touch_create_cards_updated_at();

alter table public.create_cards enable row level security;

drop policy if exists "create_cards_select_own" on public.create_cards;
create policy "create_cards_select_own"
on public.create_cards
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "create_cards_insert_own" on public.create_cards;
create policy "create_cards_insert_own"
on public.create_cards
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "create_cards_update_own" on public.create_cards;
create policy "create_cards_update_own"
on public.create_cards
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "create_cards_delete_own" on public.create_cards;
create policy "create_cards_delete_own"
on public.create_cards
for delete
to authenticated
using (auth.uid() = user_id);

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
      and tablename = 'create_cards'
  ) then
    alter publication supabase_realtime add table public.create_cards;
  end if;
end;
$$;
