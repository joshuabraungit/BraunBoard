-- "Say it in their words": a saved résumé per account, one tailored copy per job,
-- and the things people confirm they've done ("Things I've done").
-- RLS on with no policies: server only (admin client, always filtered by user_id).

create table if not exists public.saved_resumes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  file_name text not null,
  body text not null,
  updated_at timestamptz not null default now()
);
alter table public.saved_resumes enable row level security;

create table if not exists public.resume_copies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_slug text not null,
  company text not null,
  job_title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_slug)
);
alter table public.resume_copies enable row level security;
create index if not exists resume_copies_user on public.resume_copies (user_id, updated_at desc);

create table if not exists public.resume_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  want text not null,
  said text not null,
  created_at timestamptz not null default now()
);
alter table public.resume_facts enable row level security;
create index if not exists resume_facts_user on public.resume_facts (user_id, created_at desc);

-- Per-account daily cap on "their words" runs.
alter table public.job_tool_runs add column if not exists user_id uuid;
create index if not exists job_tool_runs_user_time on public.job_tool_runs (user_id, tool, created_at desc);
