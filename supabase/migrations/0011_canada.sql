-- US + Canada. Each job lists the markets it's open in; CAD pay gets a rough USD value for filters.
alter table public.jobs add column if not exists markets text[] not null default '{US}';
alter table public.jobs add column if not exists salary_max_usd integer generated always as (case when currency = 'CAD' then round(salary_max * 0.72)::int else salary_max end) stored;
alter table public.jobs add column if not exists ote_max_usd integer generated always as (case when currency = 'CAD' then round(ote_max * 0.72)::int else ote_max end) stored;
create index if not exists jobs_markets_idx on public.jobs using gin (markets);
alter table public.watches add column if not exists countries text[] not null default '{US}';

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
  where j.is_active and not j.is_disabled and j.duplicate_of is null and not c.is_disabled;
