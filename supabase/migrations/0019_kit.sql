-- "Before You Say Yes" kit downloads. One row per download click. Service role only.
create table if not exists public.kit_downloads (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  source text
);
alter table public.kit_downloads enable row level security;
