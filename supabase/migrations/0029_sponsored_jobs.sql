-- Sponsored job orders from /sponsor. A row is created before Stripe Checkout
-- and marked paid by the webhook (or the thank-you page, whichever lands first).
-- Service role only: no RLS policies on purpose.
create table if not exists public.sponsored_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'paid', 'live', 'done', 'canceled')),
  company text not null,
  contact_name text not null,
  email text not null,
  job_title text not null,
  job_url text not null,
  description text not null,
  salary_min integer,
  salary_max integer,
  ote_min integer,
  ote_max integer,
  currency text not null default 'USD',
  location text,
  remote_type text not null check (remote_type in ('Remote', 'Hybrid', 'On-site')),
  start_date date,
  logo_path text,
  notes text,
  amount_cents integer not null,
  stripe_session_id text unique,
  stripe_payment_intent text,
  paid_at timestamptz
);
create index if not exists sponsored_jobs_status_idx on public.sponsored_jobs (status, created_at desc);
alter table public.sponsored_jobs enable row level security;

-- Public bucket for sponsor logos (uploads go through the service role).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sponsor-logos', 'sponsor-logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;
