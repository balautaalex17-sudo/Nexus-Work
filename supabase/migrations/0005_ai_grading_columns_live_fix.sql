alter table public.history
  add column if not exists per_item jsonb,
  add column if not exists ai_accepted jsonb,
  add column if not exists dismissed_mistakes jsonb not null default '[]'::jsonb;

notify pgrst, 'reload schema';
