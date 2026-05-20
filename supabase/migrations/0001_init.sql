create extension if not exists "uuid-ossp";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam text not null check (exam in ('KET', 'PET', 'FCE', 'CAE', 'CPE')),
  part text not null check (part in ('part1','part2','part3','part4','part5','part6','part7')),
  title text not null,
  topic text not null,
  topic_normalized text generated always as (lower(regexp_replace(topic, '\s+', ' ', 'g'))) stored,
  exercise jsonb not null,
  user_answers jsonb not null,
  score integer not null,
  max_score integer not null,
  created_at timestamptz not null default now()
);

create index history_user_created_idx on public.history (user_id, created_at desc);
create index history_user_exam_part_idx on public.history (user_id, exam, part);
create index history_user_topic_idx on public.history (user_id, exam, part, topic_normalized);

alter table public.profiles enable row level security;
alter table public.history enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can view own history"
  on public.history for select
  using (auth.uid() = user_id);

create policy "Users can insert own history"
  on public.history for insert
  with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
