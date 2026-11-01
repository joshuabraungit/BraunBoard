-- One role posted in several cities. Companies often post the same AE job once per city,
-- which made one opening look like six. A copy points at the first posting of the role
-- (role_group = that job's id). The first posting has role_group null.
-- Copies stay visible, so a search in Austin still finds the Austin listing, but lists show
-- one card per role and "distinct roles" counts only rows where role_group is null.
alter table public.jobs add column if not exists role_group uuid references public.jobs(id) on delete set null;
create index if not exists jobs_role_group_idx on public.jobs (role_group) where role_group is not null;

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
    c.size_bucket as company_size,
    j.role_group
  from public.jobs j
  join public.companies c on c.id = j.company_id
  where j.is_active and not j.is_disabled and j.duplicate_of is null and not c.is_disabled
    and j.posted_at >= now() - interval '365 days';

-- When the first posting of a role closes but other cities are still open, the oldest open
-- copy becomes the new first posting. Run after each company crawl.
create or replace function public.regroup_roles(p_company uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare moved integer := 0;
begin
  with orphans as (
    select j.id, j.role_group as old_root, j.first_seen_at
    from jobs j
    left join jobs r on r.id = j.role_group
    where j.company_id = p_company and j.role_group is not null and j.is_active
      and (r.id is null or not r.is_active)
  ),
  new_roots as (
    select distinct on (old_root) old_root, id as new_root from orphans order by old_root, first_seen_at, id
  ),
  upd as (
    update jobs j set role_group = case when j.id = n.new_root then null else n.new_root end
    from orphans o join new_roots n on n.old_root = o.old_root
    where j.id = o.id
    returning 1
  )
  select count(*) into moved from upd;
  return moved;
end $$;
revoke all on function public.regroup_roles(uuid) from public, anon, authenticated;
grant execute on function public.regroup_roles(uuid) to service_role;
