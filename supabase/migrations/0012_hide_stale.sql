-- Hide postings more than a year old. They are almost always evergreen or forgotten
-- listings, not real open roles. Company stats count the same set so numbers match.
create or replace view public.visible_jobs with (security_invoker = true) as
  select j.id, j.slug, j.company_id, j.source_job_id, j.source_provider, j.source_url, j.apply_url, j.title_raw,
    j.title_normalized, j.role_family, j.seniority, j.sales_segment, j.location_raw, j.city, j.state, j.country,
    j.remote_type, j.employment_type, j.salary_min, j.salary_max, j.ote_min, j.ote_max, j.currency, j.description_raw,
    j.summary, j.disclosures, j.sales_motion, j.self_sourcing_level, j.customer_segment, j.first_seen_at, j.last_seen_at,
    j.missed_checks, j.removed_at, j.is_active, j.dedupe_key, j.duplicate_of, j.needs_review, j.is_disabled,
    j.classification_overridden, j.created_at, j.updated_at,
    c.name as company_name, c.slug as company_slug, c.logo_url as company_logo_url, c.domain as company_domain,
    j.flags, j.source_posted_at, j.posted_at, j.markets, j.salary_max_usd, j.ote_max_usd
  from public.jobs j
  join public.companies c on c.id = j.company_id
  where j.is_active and not j.is_disabled and j.duplicate_of is null and not c.is_disabled
    and j.posted_at >= now() - interval '365 days';

create or replace function public.refresh_company_stats()
returns void
language sql
set search_path = ''
as $$
  with raw as (
    select j.company_id, j.source_posted_at, j.first_seen_at, j.removed_at,
           (j.is_active and not j.is_disabled
            and coalesce(j.source_posted_at, j.first_seen_at) >= now() - interval '365 days') as is_open,
           min(j.first_seen_at) over (partition by j.company_id) as tracked_since
    from public.jobs j
    join public.companies c on c.id = j.company_id
    where j.duplicate_of is null and not c.is_disabled
  ),
  base as (
    -- Prefer the employer's own posting date. Without one, first_seen_at only means
    -- "newly posted" once we were already watching that board; the first crawl is a pile.
    select company_id, removed_at, is_open,
           coalesce(source_posted_at, case when first_seen_at > tracked_since + interval '2 days' then first_seen_at end) as posted
    from raw
  ),
  agg as (
    select company_id,
      count(*) filter (where is_open) as open_roles,
      count(*) filter (where posted >= now() - interval '7 days') as new_7d,
      count(*) filter (where posted >= now() - interval '30 days') as new_30d,
      count(*) filter (where posted >= now() - interval '60 days' and posted < now() - interval '30 days') as new_prev_30d,
      count(*) filter (where not is_open and removed_at >= now() - interval '30 days') as closed_30d,
      (percentile_cont(0.5) within group (order by extract(epoch from now() - posted) / 86400) filter (where is_open))::int as median_days_open
    from base
    group by company_id
  ),
  past as (
    select distinct on (company_id) company_id, open_roles
    from public.company_open_roles_daily
    where day <= current_date - 28
    order by company_id, day desc
  )
  insert into public.company_stats as s
    (company_id, open_roles, new_7d, new_30d, new_prev_30d, closed_30d, median_days_open, open_roles_30d_ago, trend, updated_at)
  select a.company_id, a.open_roles, a.new_7d, a.new_30d, a.new_prev_30d, a.closed_30d, a.median_days_open, p.open_roles,
    case
      when (p.open_roles >= 3 and a.open_roles <= p.open_roles * 0.6)
        or (a.closed_30d >= 3 and a.closed_30d > a.new_30d * 2) then 'pulling_back'
      when a.new_30d >= 5 and a.new_30d >= greatest(a.new_prev_30d, 1) * 1.5 then 'ramping'
      else 'steady'
    end,
    now()
  from agg a left join past p using (company_id)
  on conflict (company_id) do update set
    open_roles = excluded.open_roles, new_7d = excluded.new_7d, new_30d = excluded.new_30d,
    new_prev_30d = excluded.new_prev_30d, closed_30d = excluded.closed_30d,
    median_days_open = excluded.median_days_open, open_roles_30d_ago = excluded.open_roles_30d_ago,
    trend = excluded.trend, updated_at = excluded.updated_at;

  insert into public.company_open_roles_daily (company_id, day, open_roles)
  select company_id, current_date, open_roles from public.company_stats
  on conflict (company_id, day) do update set open_roles = excluded.open_roles;
$$;

revoke execute on function public.refresh_company_stats() from public, anon, authenticated;
