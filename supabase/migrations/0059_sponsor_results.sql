-- Sponsor results page (/results/<review token>): what a sponsor's 30 days on Braun Board did.
--
-- Totals come from the counters on sponsored_jobs. "Where people came from" credits each visit
-- (and each apply click) to how that browser first arrived on Braun Board that day, so someone who
-- lands on the home page from LinkedIn and then clicks the sponsored card counts as LinkedIn.

-- One row per apply click, so clicks can be credited to a source. No personal data: visitor is the
-- same daily code page_views uses (changes every day).
create table if not exists public.sponsor_apply_clicks (
  id bigint generated always as identity primary key,
  sponsor_id uuid not null references public.sponsored_jobs(id) on delete cascade,
  visitor text,
  created_at timestamptz not null default now()
);
create index if not exists sponsor_apply_clicks_sponsor_idx on public.sponsor_apply_clicks (sponsor_id, created_at);
alter table public.sponsor_apply_clicks enable row level security;

create index if not exists page_views_visitor_idx on public.page_views (visitor, created_at);

-- Numbers Josh fills in by hand (LinkedIn and the newsletter live elsewhere), and what the sponsor
-- tells us back on the results page.
alter table public.sponsored_jobs
  add column if not exists report_linkedin_impressions integer check (report_linkedin_impressions >= 0),
  add column if not exists report_linkedin_clicks integer check (report_linkedin_clicks >= 0),
  add column if not exists report_newsletter_sent integer check (report_newsletter_sent >= 0),
  add column if not exists client_applications integer check (client_applications between 0 and 100000),
  add column if not exists client_interviews integer check (client_interviews between 0 and 100000),
  add column if not exists client_results_note text check (char_length(client_results_note) <= 2000),
  add column if not exists client_results_at timestamptz;

create or replace function public.sponsor_results(sid uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with job_views as (
    select pv.visitor, pv.created_at, pv.source
    from public.page_views pv
    where pv.path = '/sponsored/' || sid::text or pv.path like '/sponsored/' || sid::text || '?%'
  ),
  credited_views as (
    select coalesce((
      select f.source from public.page_views f
      where f.visitor = v.visitor and f.created_at >= date_trunc('day', v.created_at at time zone 'UTC') at time zone 'UTC'
        and f.created_at <= v.created_at
      order by f.created_at limit 1), v.source) as source
    from job_views v
  ),
  credited_clicks as (
    select coalesce((
      select f.source from public.page_views f
      where c.visitor is not null and f.visitor = c.visitor
        and f.created_at >= date_trunc('day', c.created_at at time zone 'UTC') at time zone 'UTC'
        and f.created_at <= c.created_at
      order by f.created_at limit 1), 'Direct') as source
    from public.sponsor_apply_clicks c
    where c.sponsor_id = sid
  )
  select jsonb_build_object(
    'views_by_source', coalesce((select jsonb_object_agg(source, n) from (select source, count(*) n from credited_views group by source) x), '{}'::jsonb),
    'clicks_by_source', coalesce((select jsonb_object_agg(source, n) from (select source, count(*) n from credited_clicks group by source) x), '{}'::jsonb),
    'tracked_clicks', (select count(*) from public.sponsor_apply_clicks where sponsor_id = sid),
    'unique_visitors', (select count(distinct visitor) from job_views)
  );
$$;
revoke all on function public.sponsor_results(uuid) from public, anon, authenticated;
