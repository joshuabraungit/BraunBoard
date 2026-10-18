-- Scratch table for testing "What they sell" before rollout. Service role only.
create table if not exists public.product_samples (
  id bigint generated always as identity primary key,
  run_at timestamptz not null default now(),
  company_id uuid not null,
  company text,
  old_category text,
  job_title text,
  story text,
  short text,
  quote text,
  category text,
  raw jsonb,
  error text
);
alter table public.product_samples enable row level security;
