create table if not exists public.api_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, bucket)
);

create index if not exists api_usage_updated_idx
  on public.api_usage (updated_at);

alter table public.api_usage enable row level security;

drop policy if exists "deny all api_usage" on public.api_usage;

create or replace function public.consume_ai_quota(
  p_minute_cap integer,
  p_day_cap integer
) returns table(allowed boolean, minute_count integer, day_count integer, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := now() at time zone 'utc';
  v_min_bucket text := 'min:' || to_char(v_now, 'YYYYMMDDHH24MI');
  v_day_bucket text := 'day:' || to_char(v_now, 'YYYY-MM-DD');
  v_min_count integer;
  v_day_count integer;
begin
  if v_user_id is null then
    return query select false, 0, 0, 'unauthorized'::text;
    return;
  end if;

  insert into public.api_usage(user_id, bucket, count)
    values (v_user_id, v_min_bucket, 1)
  on conflict (user_id, bucket)
    do update set count = public.api_usage.count + 1, updated_at = v_now
  returning count into v_min_count;

  insert into public.api_usage(user_id, bucket, count)
    values (v_user_id, v_day_bucket, 1)
  on conflict (user_id, bucket)
    do update set count = public.api_usage.count + 1, updated_at = v_now
  returning count into v_day_count;

  if v_min_count > p_minute_cap then
    return query select false, v_min_count, v_day_count, 'minute_cap'::text;
    return;
  end if;

  if v_day_count > p_day_cap then
    return query select false, v_min_count, v_day_count, 'day_cap'::text;
    return;
  end if;

  return query select true, v_min_count, v_day_count, null::text;
end;
$$;

revoke all on function public.consume_ai_quota(integer, integer) from public, anon;
grant execute on function public.consume_ai_quota(integer, integer) to authenticated;

notify pgrst, 'reload schema';
