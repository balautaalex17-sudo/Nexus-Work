alter table public.history
  add column if not exists dismissed_mistakes jsonb not null default '[]'::jsonb;
