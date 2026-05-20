alter table public.history
  add column if not exists per_item jsonb,
  add column if not exists ai_accepted jsonb;

create policy "Users can update own history"
  on public.history for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
