-- Live window and counters for sponsored jobs. Josh approves with "Mark live",
-- which sets live_at (or the buyer's start date if later) and ends_at = live_at + 30 days.
alter table public.sponsored_jobs
  add column if not exists live_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists views integer not null default 0,
  add column if not exists apply_clicks integer not null default 0;

create index if not exists sponsored_jobs_live_idx on public.sponsored_jobs (live_at desc) where status = 'live';

-- Atomic +1 so two visitors at once both count.
create or replace function public.sponsored_job_bump(sid uuid, what text)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.sponsored_jobs
     set views = views + case when what = 'view' then 1 else 0 end,
         apply_clicks = apply_clicks + case when what = 'apply' then 1 else 0 end
   where id = sid;
$$;
revoke all on function public.sponsored_job_bump(uuid, text) from public, anon, authenticated;
