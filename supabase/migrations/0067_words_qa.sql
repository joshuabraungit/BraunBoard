-- Scratch table for testing "Say it in their words" with made-up résumés. Server only.
create table if not exists public.words_qa (
  id bigint generated always as identity primary key,
  batch text not null,
  resume_name text not null,
  job_slug text not null,
  company text,
  job_title text,
  raw jsonb,
  cleaned jsonb,
  gap_line jsonb,
  copy text,
  error text,
  created_at timestamptz not null default now()
);
alter table public.words_qa enable row level security;
