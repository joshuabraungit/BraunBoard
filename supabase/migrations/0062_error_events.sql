-- Errors the site hits, logged for the hourly auto-fix run (instead of emailing Josh).
-- One row per error per hour (same fingerprint), with a running count.
-- Service role only: no policies, so the public keys can't read or write it.

create table if not exists public.error_events (
  id bigint generated always as identity primary key,
  fingerprint text not null,
  hour bigint not null,
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  count integer not null default 1,
  where_ text not null,
  method text,
  path text,
  message text,
  stack text,
  digest text,
  request_id text,
  -- Set by the auto-fix run once it's handled. note says what it did.
  fixed_at timestamptz,
  note text,
  unique (fingerprint, hour)
);
create index if not exists error_events_open_idx on public.error_events (last_at desc) where fixed_at is null;
alter table public.error_events enable row level security;

-- Insert, or bump the count if this error already happened this hour.
create or replace function public.log_error_event(
  p_fingerprint text, p_hour bigint, p_where text, p_method text, p_path text,
  p_message text, p_stack text, p_digest text, p_request_id text
) returns void language sql security definer set search_path = public as $$
  insert into public.error_events (fingerprint, hour, where_, method, path, message, stack, digest, request_id)
  values (p_fingerprint, p_hour, left(p_where, 200), left(p_method, 10), left(p_path, 200),
          left(p_message, 500), left(p_stack, 4000), left(p_digest, 100), left(p_request_id, 200))
  on conflict (fingerprint, hour) do update
    set count = public.error_events.count + 1, last_at = now(),
        digest = excluded.digest, request_id = excluded.request_id;
$$;
revoke all on function public.log_error_event(text, bigint, text, text, text, text, text, text, text) from public, anon, authenticated;
