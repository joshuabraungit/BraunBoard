-- "What they sell, in plain English": one fact-checked story per company, from its own job postings.
alter table public.companies
  add column if not exists product_story text,
  add column if not exists product_short text,
  add column if not exists product_quote text,
  add column if not exists product_category text,
  add column if not exists product_checked_at timestamptz,
  add column if not exists product_changed_at timestamptz;
create index if not exists companies_product_category on public.companies (product_category);

-- Products page usage (See jobs taps, watches from the page). Service role only.
create table if not exists public.product_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  event text not null,
  company_id uuid,
  source text
);
alter table public.product_events enable row level security;
