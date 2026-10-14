-- Scratch table for testing buyer extraction before rolling it out. Service role only.
create table if not exists public.buyer_samples (
  id bigint generated always as identity primary key,
  run_at timestamptz not null default now(),
  job_id uuid not null,
  company text,
  title text,
  segment text,
  buyer text,
  buyer_quote text,
  buyer_quote_found boolean,
  industry text,
  industry_quote text,
  industry_quote_found boolean,
  raw jsonb,
  error text
);
alter table public.buyer_samples enable row level security;
