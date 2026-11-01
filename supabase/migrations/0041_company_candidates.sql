-- Company discovery. Companies found hiring salespeople on an employer job board we support,
-- waiting for a yes or no in Admin > Discover. Nothing here is crawled or shown on the site
-- until it's approved and becomes a real company.
create table if not exists public.company_candidates (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  domain          text,
  ats_provider    public.ats_provider not null,
  ats_identifier  text not null,
  -- Where we found them, e.g. "workable-feed" or "search".
  source          text not null,
  -- Sales jobs in our markets when last checked, and a few titles so the decision is quick.
  sales_jobs      integer not null default 0,
  sample_titles   text[] not null default '{}',
  markets         text[] not null default '{}',
  status          text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  -- Why it was flagged for a closer look (staffing agency, consumer sales...). Null when it looks fine.
  note            text,
  first_found_at  timestamptz not null default now(),
  last_found_at   timestamptz not null default now(),
  decided_at      timestamptz,
  unique (ats_provider, ats_identifier)
);
create index if not exists company_candidates_pending_idx on public.company_candidates (sales_jobs desc) where status = 'pending';

alter table public.company_candidates enable row level security;
-- No public access: only the service role (crawler, admin pages) reads or writes it.
