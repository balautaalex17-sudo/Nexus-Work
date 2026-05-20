drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can view own history" on public.history;
drop policy if exists "Users can insert own history" on public.history;
drop policy if exists "Users can update own history" on public.history;

create policy "Users can view own profile"
  on public.profiles for select
  using ((select auth.uid()) = id);

create policy "Users can update own profile"
  on public.profiles for update
  using ((select auth.uid()) = id);

create policy "Users can view own history"
  on public.history for select
  using ((select auth.uid()) = user_id);

create policy "Users can insert own history"
  on public.history for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update own history"
  on public.history for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
