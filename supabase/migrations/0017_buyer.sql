-- "Who you're selling to": buyer and industry as the posting states them, each with a verified quote.
-- buyer_checked_at is set once the AI has looked, so jobs with no stated buyer aren't re-asked.
alter table public.jobs add column if not exists buyer text;
alter table public.jobs add column if not exists buyer_quote text;
alter table public.jobs add column if not exists industry text;
alter table public.jobs add column if not exists industry_quote text;
alter table public.jobs add column if not exists buyer_checked_at timestamptz;

create or replace view public.visible_jobs with (security_invoker = true) as
  select j.id, j.slug, j.company_id, j.source_job_id, j.source_provider, j.source_url, j.apply_url, j.title_raw,
    j.title_normalized, j.role_family, j.seniority, j.sales_segment, j.location_raw, j.city, j.state, j.country,
    j.remote_type, j.employment_type, j.salary_min, j.salary_max, j.ote_min, j.ote_max, j.currency, j.description_raw,
    j.summary, j.disclosures, j.sales_motion, j.self_sourcing_level, j.customer_segment, j.first_seen_at, j.last_seen_at,
    j.missed_checks, j.removed_at, j.is_active, j.dedupe_key, j.duplicate_of, j.needs_review, j.is_disabled,
    j.classification_overridden, j.created_at, j.updated_at,
    c.name as company_name, c.slug as company_slug, c.logo_url as company_logo_url, c.domain as company_domain,
    j.flags, j.source_posted_at, j.posted_at, j.markets, j.salary_max_usd, j.ote_max_usd, j.attainment,
    j.buyer, j.buyer_quote, j.industry, j.industry_quote, j.buyer_checked_at
  from public.jobs j
  join public.companies c on c.id = j.company_id
  where j.is_active and not j.is_disabled and j.duplicate_of is null and not c.is_disabled
    and j.posted_at >= now() - interval '365 days';
