-- "Has today's digest gone out?" Each daily job claims its slot once, so hourly runs can catch up without repeating.
create table if not exists public.scheduled_runs (
  job        text not null,
  run_key    text not null,
  claimed_at timestamptz not null default now(),
  primary key (job, run_key)
);
alter table public.scheduled_runs enable row level security;
