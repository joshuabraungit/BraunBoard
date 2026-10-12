-- Braun's Picks: weekly hand-checked job picks email.
create table if not exists public.picks_subscribers (
  id               uuid primary key default gen_random_uuid(),
  email            text not null unique,
  status           text not null default 'active' check (status in ('active', 'unsubscribed')),
  source           text,
  created_at       timestamptz not null default now(),
  unsubscribed_at  timestamptz
);

create table if not exists public.picks_issues (
  id          uuid primary key default gen_random_uuid(),
  issue_date  date not null unique,
  status      text not null default 'scheduled' check (status in ('scheduled', 'paused', 'sending', 'sent')),
  subject     text not null,
  intro       text not null default '',
  stat_line   text,
  send_at     timestamptz not null,
  sent_at     timestamptz,
  recipients  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.picks_items (
  id          uuid primary key default gen_random_uuid(),
  issue_id    uuid not null references public.picks_issues(id) on delete cascade,
  kind        text not null check (kind in ('pick', 'skip')),
  position    integer not null default 0,
  job_id      uuid references public.jobs(id) on delete set null,
  job_slug    text,
  title       text not null,
  company     text,
  pay         text,
  meta        text,
  take        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists picks_items_issue_idx on public.picks_items (issue_id, kind, position);

create table if not exists public.picks_clicks (
  id             uuid primary key default gen_random_uuid(),
  item_id        uuid not null references public.picks_items(id) on delete cascade,
  subscriber_id  uuid references public.picks_subscribers(id) on delete set null,
  clicked_at     timestamptz not null default now()
);
create index if not exists picks_clicks_item_idx on public.picks_clicks (item_id);

-- Service role only: no policies, so anon/authenticated can't read or write.
alter table public.picks_subscribers enable row level security;
alter table public.picks_issues enable row level security;
alter table public.picks_items enable row level security;
alter table public.picks_clicks enable row level security;

create trigger picks_issues_updated_at before update on public.picks_issues
  for each row execute function public.set_updated_at();
