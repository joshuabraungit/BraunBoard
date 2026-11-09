-- Fast Track: a sponsor gives Braun Board a handful of guaranteed screening calls (e.g. 5).
-- Each person who claims one gets their own code (BB-FT1, BB-FT2, ...) to put on the sponsor's
-- application, so the sponsor can find them. Scarcity is real: once they're gone, the box closes.

alter table public.sponsored_jobs
  -- How many codes this sponsor offers. Null = no Fast Track box.
  add column if not exists fast_track_total integer check (fast_track_total between 1 and 50),
  -- Where Fast Track applicants apply (the sponsor's form). Falls back to job_url.
  add column if not exists fast_track_url text,
  -- Length of the screening call, in minutes.
  add column if not exists fast_track_minutes integer check (fast_track_minutes between 5 and 120),
  -- Where on the application the code goes, in the sponsor's words.
  add column if not exists fast_track_where text check (char_length(fast_track_where) <= 500);

create table if not exists public.fast_track_codes (
  id bigint generated always as identity primary key,
  sponsor_id uuid not null references public.sponsored_jobs(id) on delete cascade,
  code text not null,
  name text check (char_length(name) <= 120),
  email text check (char_length(email) <= 254),
  claimed_at timestamptz,
  unique (sponsor_id, code),
  unique (sponsor_id, email)
);
create index if not exists fast_track_codes_sponsor_idx on public.fast_track_codes (sponsor_id, claimed_at);
alter table public.fast_track_codes enable row level security;

-- Hands out the next free code, one at a time even if two people click at once.
-- Someone who already claimed gets their same code back. Null = all gone.
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
      order by id
      limit 1
      for update skip locked)
  returning c.code into got;
  return got;
end;
$$;
revoke all on function public.claim_fast_track(uuid, text, text) from public, anon, authenticated;
