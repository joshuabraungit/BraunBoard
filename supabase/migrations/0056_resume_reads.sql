-- One row per résumé read on /for-you, so the reader can be rate-limited.
-- Each read sends a file to Claude, which costs money. No résumé content is stored:
-- just a hashed IP and when it happened. RLS on with no policies: server only.
create table if not exists public.resume_reads (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
alter table public.resume_reads enable row level security;
create index if not exists resume_reads_ip_time on public.resume_reads (ip_hash, created_at desc);
create index if not exists resume_reads_time on public.resume_reads (created_at desc);
