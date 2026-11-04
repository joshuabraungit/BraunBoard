-- Job tools (what people say, résumé tune-up, letter, interview prep).
-- RLS on with no policies on both tables: server only.

-- One cached "what are people saying" read per company, refreshed after 14 days.
create table if not exists public.company_chatter (
  company_id uuid primary key references public.companies (id) on delete cascade,
  lines jsonb not null default '[]'::jsonb,
  thin boolean not null default false,
  checked_at timestamptz not null default now()
);
alter table public.company_chatter enable row level security;

-- One row per paid tool run, for the rate limit. No résumé or letter content is stored:
-- just which tool, a hashed IP, and when.
create table if not exists public.job_tool_runs (
  id bigint generated always as identity primary key,
  tool text not null,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
alter table public.job_tool_runs enable row level security;
create index if not exists job_tool_runs_ip_time on public.job_tool_runs (ip_hash, created_at desc);
create index if not exists job_tool_runs_time on public.job_tool_runs (created_at desc);
create index if not exists job_tool_runs_tool_time on public.job_tool_runs (tool, created_at desc);
