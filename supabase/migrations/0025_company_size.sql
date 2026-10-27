-- Company size for the jobs filter. Four buckets. Where it came from is kept so the site can say
-- "about" when it's an estimate, and so an admin correction is never overwritten.
alter table public.companies add column if not exists size_bucket text check (size_bucket in ('startup', 'growth', 'large', 'enterprise'));
alter table public.companies add column if not exists size_source text check (size_source in ('posting', 'estimate', 'admin', 'careers'));
alter table public.companies add column if not exists size_quote text;
alter table public.companies add column if not exists size_checked_at timestamptz;

-- Sizes we already had from careers sites.
update public.companies set
  size_bucket = case
    when employee_range in ('1-10', '11-50', '51-200') then 'startup'
    when employee_range in ('201-500', '501-1000') then 'growth'
    when employee_range in ('1001-5000') then 'large'
    when employee_range in ('5001-10000', '10001+', '10000+') then 'enterprise'
  end,
  size_source = 'careers'
where employee_range is not null and size_bucket is null;

create or replace view public.visible_jobs with (security_invoker = true) as
  select j.id, j.slug, j.company_id, j.source_job_id, j.source_provider, j.source_url, j.apply_url, j.title_raw,
    j.title_normalized, j.role_family, j.seniority, j.sales_segment, j.location_raw, j.city, j.state, j.country,
    j.remote_type, j.employment_type, j.salary_min, j.salary_max, j.ote_min, j.ote_max, j.currency, j.description_raw,
    j.summary, j.disclosures, j.sales_motion, j.self_sourcing_level, j.customer_segment, j.first_seen_at, j.last_seen_at,
    j.missed_checks, j.removed_at, j.is_active, j.dedupe_key, j.duplicate_of, j.needs_review, j.is_disabled,
    j.classification_overridden, j.created_at, j.updated_at,
    c.name as company_name, c.slug as company_slug, c.logo_url as company_logo_url, c.domain as company_domain,
    j.flags, j.source_posted_at, j.posted_at, j.markets, j.salary_max_usd, j.ote_max_usd, j.attainment,
    j.buyer, j.buyer_quote, j.industry, j.industry_quote, j.buyer_checked_at,
    c.size_bucket as company_size
  from public.jobs j
  join public.companies c on c.id = j.company_id
  where j.is_active and not j.is_disabled and j.duplicate_of is null and not c.is_disabled
    and j.posted_at >= now() - interval '365 days';
