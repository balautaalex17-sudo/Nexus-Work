create table if not exists public.custom_drill_sets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists custom_drill_sets_user_created_idx
  on public.custom_drill_sets (user_id, created_at desc);

alter table public.custom_drill_sets enable row level security;

drop policy if exists "Users can view own custom drill sets" on public.custom_drill_sets;
drop policy if exists "Users can insert own custom drill sets" on public.custom_drill_sets;
drop policy if exists "Users can update own custom drill sets" on public.custom_drill_sets;
drop policy if exists "Users can delete own custom drill sets" on public.custom_drill_sets;

create policy "Users can view own custom drill sets"
  on public.custom_drill_sets for select
  using ((select auth.uid()) = user_id);

create policy "Users can insert own custom drill sets"
  on public.custom_drill_sets for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update own custom drill sets"
  on public.custom_drill_sets for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own custom drill sets"
  on public.custom_drill_sets for delete
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own history" on public.history;

create policy "Users can delete own history"
  on public.history for delete
  using ((select auth.uid()) = user_id);
