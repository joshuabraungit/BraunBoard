-- Visitor counts for the admin dashboard. No cookies and nothing that identifies a person:
-- `visitor` is a code made from the visitor's network address and browser that changes every day,
-- so the same person counts once per day and can't be followed from one day to the next.
create table if not exists public.page_views (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  path text not null,
  source text not null default 'Direct',
  visitor text not null,
  country text,
  device text
);
create index if not exists page_views_created_at on public.page_views (created_at);
alter table public.page_views enable row level security;

-- Everything the Visitors page shows, for the last `days` days, by New York date.
create or replace function public.admin_traffic(days int default 30)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with v as (
    select *, (created_at at time zone 'America/New_York')::date as d
    from public.page_views
    where created_at >= now() - make_interval(days => days + 1)
  ),
  today as (select (now() at time zone 'America/New_York')::date as d),
  -- Each visitor's first page of the day decides where that visit came from.
  firsts as (
    select distinct on (d, visitor) d, visitor, source, path, country, device
    from v order by d, visitor, created_at
  )
  select jsonb_build_object(
    'today_visitors', (select count(distinct visitor) from v, today where v.d = today.d),
    'today_views', (select count(*) from v, today where v.d = today.d),
    'week_visitors', (select count(*) from firsts, today where firsts.d > today.d - 7),
    'week_views', (select count(*) from v, today where v.d > today.d - 7),
    'month_visitors', (select count(*) from firsts, today where firsts.d > today.d - days),
    'month_views', (select count(*) from v, today where v.d > today.d - days),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('d', g.d, 'visitors', coalesce(x.visitors, 0), 'views', coalesce(x.views, 0)) order by g.d)
      from (select generate_series((select d from today) - (days - 1), (select d from today), interval '1 day')::date as d) g
      left join (select d, count(distinct visitor) visitors, count(*) views from v group by d) x on x.d = g.d
    ), '[]'::jsonb),
    'sources', coalesce((
      select jsonb_agg(jsonb_build_object('label', source, 'n', n) order by n desc)
      from (select source, count(*) n from firsts, today where firsts.d > today.d - days group by source order by n desc limit 10) s
    ), '[]'::jsonb),
    'pages', coalesce((
      select jsonb_agg(jsonb_build_object('label', path, 'n', n) order by n desc)
      from (select split_part(path, '?', 1) as path, count(*) n from v, today where v.d > today.d - days group by 1 order by n desc limit 15) s
    ), '[]'::jsonb),
    'landing', coalesce((
      select jsonb_agg(jsonb_build_object('label', path, 'n', n) order by n desc)
      from (select split_part(path, '?', 1) as path, count(*) n from firsts, today where firsts.d > today.d - days group by 1 order by n desc limit 10) s
    ), '[]'::jsonb),
    'countries', coalesce((
      select jsonb_agg(jsonb_build_object('label', coalesce(country, '?'), 'n', n) order by n desc)
      from (select country, count(*) n from firsts, today where firsts.d > today.d - days group by country order by n desc limit 8) s
    ), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_agg(jsonb_build_object('label', coalesce(device, '?'), 'n', n) order by n desc)
      from (select device, count(*) n from firsts, today where firsts.d > today.d - days group by device order by n desc) s
    ), '[]'::jsonb)
  );
$$;

revoke execute on function public.admin_traffic(int) from public, anon, authenticated;
grant execute on function public.admin_traffic(int) to service_role;
