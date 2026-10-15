-- "Ask Josh": questions and offers people send from the site. Service role only (no public read or write).
create table if not exists public.ask_messages (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  email text not null,
  name text,
  message text not null,
  offer text,
  job_id uuid,
  job_slug text,
  user_id uuid,
  source text,
  ip_hash text,
  emailed boolean not null default false,
  error text
);
create index if not exists ask_messages_ip_time on public.ask_messages (ip_hash, created_at desc);
create index if not exists ask_messages_email_time on public.ask_messages (email, created_at desc);
alter table public.ask_messages enable row level security;
