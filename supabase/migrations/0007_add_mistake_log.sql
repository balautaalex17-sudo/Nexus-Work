alter table public.history
  add column if not exists mistake_log jsonb not null default '[]'::jsonb;
