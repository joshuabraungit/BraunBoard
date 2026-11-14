-- Fast Track codes can be added ahead of time and switched on later.
-- A code with available_at in the future can't be claimed and isn't counted on the job page yet.

alter table public.fast_track_codes
  add column if not exists available_at timestamptz;

create or replace function public.claim_fast_track(sid uuid, p_name text, p_email text)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  got text;
begin
  select code into got from public.fast_track_codes where sponsor_id = sid and email = lower(p_email);
  if got is not null then
    return got;
  end if;
  update public.fast_track_codes c
     set name = p_name, email = lower(p_email), claimed_at = now()
   where c.id = (
     select id from public.fast_track_codes
      where sponsor_id = sid and claimed_at is null
        and (available_at is null or available_at <= now())
      order by id
      limit 1
      for update skip locked)
  returning c.code into got;
  return got;
end;
$$;
revoke all on function public.claim_fast_track(uuid, text, text) from public, anon, authenticated;
