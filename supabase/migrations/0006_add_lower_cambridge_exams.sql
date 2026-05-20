alter table public.history
  drop constraint if exists history_exam_check;

alter table public.history
  add constraint history_exam_check
  check (exam in ('KET', 'PET', 'FCE', 'CAE', 'CPE'));

notify pgrst, 'reload schema';
