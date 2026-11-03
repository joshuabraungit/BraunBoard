-- One-off emails (like a sponsored job announcement) go to everyone on Braun Board.
-- Unsubscribing from those lands here, separate from job alerts and Braun's Picks.
create table if not exists public.email_optouts (
  email text primary key,
  created_at timestamptz not null default now()
);
alter table public.email_optouts enable row level security;

-- Who got which one-off email, so a re-run never double-sends.
create table if not exists public.email_sends (
  campaign text not null,
  email text not null,
  sent_at timestamptz not null default now(),
  primary key (campaign, email)
);
alter table public.email_sends enable row level security;
