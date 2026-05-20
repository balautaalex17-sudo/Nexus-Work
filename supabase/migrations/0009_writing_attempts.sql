alter table public.history
  add column if not exists writing_feedback jsonb,
  add column if not exists genre text;

alter table public.history
  drop constraint if exists history_part_check;

alter table public.history
  add constraint history_part_check
  check (
    part in (
      'part1','part2','part3','part4','part5','part6','part7',
      'writing_part1','writing_part2'
    )
  );

create index if not exists history_user_writing_idx
  on public.history (user_id, created_at desc)
  where part in ('writing_part1','writing_part2');

notify pgrst, 'reload schema';
