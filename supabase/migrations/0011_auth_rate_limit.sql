create table if not exists public.auth_rate_limit (
  client_key text not null,
  bucket text not null,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (client_key, bucket)
);

create index if not exists auth_rate_limit_updated_idx
  on public.auth_rate_limit (updated_at);

alter table public.auth_rate_limit enable row level security;

create or replace function public.consume_auth_quota(
  p_client_key text,
  p_minute_cap integer,
  p_hour_cap integer
) returns table(allowed boolean, minute_count integer, hour_count integer, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now() at time zone 'utc';
  v_min_bucket text := 'min:' || to_char(v_now, 'YYYYMMDDHH24MI');
  v_hour_bucket text := 'hour:' || to_char(v_now, 'YYYYMMDDHH24');
  v_key text;
  v_min_count integer;
  v_hour_count integer;
begin
  if p_client_key is null or length(p_client_key) = 0 then
    return query select false, 0, 0, 'invalid_key'::text;
    return;
  end if;

  v_key := left(p_client_key, 128);

  insert into public.auth_rate_limit(client_key, bucket, count)
    values (v_key, v_min_bucket, 1)
  on conflict (client_key, bucket)
    do update set count = public.auth_rate_limit.count + 1, updated_at = v_now
  returning count into v_min_count;

  insert into public.auth_rate_limit(client_key, bucket, count)
    values (v_key, v_hour_bucket, 1)
  on conflict (client_key, bucket)
    do update set count = public.auth_rate_limit.count + 1, updated_at = v_now
  returning count into v_hour_count;

  if v_min_count > p_minute_cap then
    return query select false, v_min_count, v_hour_count, 'minute_cap'::text;
    return;
  end if;

  if v_hour_count > p_hour_cap then
    return query select false, v_min_count, v_hour_count, 'hour_cap'::text;
    return;
  end if;

  return query select true, v_min_count, v_hour_count, null::text;
end;
$$;

revoke all on function public.consume_auth_quota(text, integer, integer) from public;
grant execute on function public.consume_auth_quota(text, integer, integer) to anon, authenticated;

notify pgrst, 'reload schema';
