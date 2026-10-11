-- Braun Board V1 schema
-- Spec: docs/SPEC.md sections 7, 9, 10, 13, 16

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------------
-- Enums (allowed values come straight from the spec; "Unknown" is always valid)
-- ---------------------------------------------------------------------------
create type ats_provider as enum ('greenhouse', 'lever', 'ashby');

create type role_family as enum (
  'SDR/BDR',
  'Account Executive',
  'Account Manager',
  'Customer Expansion',
  'Sales Engineer',
  'Sales Manager',
  'Sales Director',
  'VP Sales',
  'CRO'
);

create type seniority as enum ('Individual Contributor', 'Manager', 'Director', 'Executive', 'Unknown');
create type sales_segment as enum ('SMB', 'Mid-Market', 'Enterprise', 'Strategic', 'Unknown');
create type sales_motion as enum ('New Logo', 'Expansion', 'Mixed', 'Channel', 'Unknown');
create type self_sourcing_level as enum ('Low', 'Medium', 'High', 'Unknown');
create type remote_type as enum ('Remote', 'Hybrid', 'Onsite', 'Unknown');
create type alert_frequency as enum ('instant', 'daily', 'off');

-- ---------------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------------
create table companies (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  name             text not null,
  domain           text,
  logo_url         text,
  website_url      text,
  industry         text,
  employee_range   text,
  ats_provider     ats_provider,
  ats_identifier   text,
  careers_url      text,
  is_disabled      boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  last_crawled_at  timestamptz,
  unique (ats_provider, ats_identifier)
);

-- ---------------------------------------------------------------------------
-- jobs
-- ---------------------------------------------------------------------------
create table jobs (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique,
  company_id           uuid not null references companies(id) on delete cascade,
  source_job_id        text not null,
  source_provider      ats_provider not null,
  source_url           text,
  apply_url            text not null,

  title_raw            text not null,
  title_normalized     text,
  role_family          role_family not null,
  seniority            seniority not null default 'Unknown',
  sales_segment        sales_segment not null default 'Unknown',

  location_raw         text,
  city                 text,
  state                text,
  country              text,
  remote_type          remote_type not null default 'Unknown',
  employment_type      text,

  -- Compensation is NULL unless explicitly published. Never inferred.
  salary_min           integer,
  salary_max           integer,
  ote_min              integer,
  ote_max              integer,
  currency             text,

  description_raw      text,
  summary              text,
  -- Which seller-relevant facts the posting explicitly states (drives "What is not disclosed")
  disclosures          jsonb not null default '{}'::jsonb,
  sales_motion         sales_motion not null default 'Unknown',
  self_sourcing_level  self_sourcing_level not null default 'Unknown',
  customer_segment     sales_segment not null default 'Unknown',

  -- Freshness: first_seen_at is when Braun Board discovered it, not the source date.
  first_seen_at        timestamptz not null default now(),
  last_seen_at         timestamptz not null default now(),
  missed_checks        integer not null default 0,
  removed_at           timestamptz,
  is_active            boolean not null default true,

  -- Dedup + admin
  dedupe_key           text not null,
  duplicate_of         uuid references jobs(id),
  needs_review         boolean not null default false,
  is_disabled          boolean not null default false,
  classification_overridden boolean not null default false,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (source_provider, source_job_id, company_id)
);

create index jobs_visible_idx on jobs (first_seen_at desc)
  where is_active and not is_disabled and duplicate_of is null;
create index jobs_company_idx on jobs (company_id);
create index jobs_dedupe_idx on jobs (dedupe_key);
create index jobs_role_segment_idx on jobs (role_family, sales_segment);
create index jobs_title_trgm_idx on jobs using gin (title_raw gin_trgm_ops);

-- What browse/search should read from. Inactive, disabled and duplicate rows never show.
create view visible_jobs with (security_invoker = true) as
  select j.*, c.name as company_name, c.slug as company_slug, c.logo_url as company_logo_url, c.domain as company_domain
  from jobs j
  join companies c on c.id = j.company_id
  where j.is_active and not j.is_disabled and j.duplicate_of is null and not c.is_disabled;

-- ---------------------------------------------------------------------------
-- Users: profiles, watches, saves
-- ---------------------------------------------------------------------------
create table profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text,
  alert_frequency  alert_frequency not null default 'daily',
  created_at       timestamptz not null default now()
);

-- A saved search ("Dream Enterprise AE Jobs"). Onboarding answers become the primary watch.
create table watches (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text not null,
  is_primary       boolean not null default false,
  role_families    role_family[] not null default '{}',
  segments         sales_segment[] not null default '{}',
  motions          sales_motion[] not null default '{}',
  remote_types     remote_type[] not null default '{}',
  locations        text[] not null default '{}',
  keywords         text[] not null default '{}',
  min_base         integer,
  min_ote          integer,
  dealbreakers     text[] not null default '{}',
  alert_frequency  alert_frequency not null default 'daily',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create unique index one_primary_watch_per_user on watches (user_id) where is_primary;

create table company_watches (
  user_id     uuid not null references auth.users(id) on delete cascade,
  company_id  uuid not null references companies(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, company_id)
);

create table saved_jobs (
  user_id     uuid not null references auth.users(id) on delete cascade,
  job_id      uuid not null references jobs(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, job_id)
);

create table hidden_jobs (
  user_id     uuid not null references auth.users(id) on delete cascade,
  job_id      uuid not null references jobs(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, job_id)
);

-- ---------------------------------------------------------------------------
-- Alerts
-- ---------------------------------------------------------------------------
create table alert_matches (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  job_id        uuid not null references jobs(id) on delete cascade,
  watch_id      uuid references watches(id) on delete cascade,
  company_watch boolean not null default false,
  match_score   integer,
  sent_at       timestamptz,
  opened_at     timestamptz,
  clicked_at    timestamptz,
  created_at    timestamptz not null default now(),
  unique (user_id, job_id)
);
create index alert_matches_unsent_idx on alert_matches (user_id) where sent_at is null;

-- ---------------------------------------------------------------------------
-- Crawler observability (admin dashboard)
-- ---------------------------------------------------------------------------
create table crawl_runs (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  jobs_seen    integer not null default 0,
  jobs_new     integer not null default 0,
  jobs_removed integer not null default 0,
  error        text
);
create index crawl_runs_errors_idx on crawl_runs (started_at desc) where error is not null;

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger companies_updated_at before update on companies for each row execute function set_updated_at();
create trigger jobs_updated_at before update on jobs for each row execute function set_updated_at();
create trigger watches_updated_at before update on watches for each row execute function set_updated_at();

-- Create a profile row on signup
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email) values (new.id, new.email) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- Row level security
-- Browsing is public. Saving, watching and alerts require an account.
-- Ingestion and admin use the service role key, which bypasses RLS.
-- ---------------------------------------------------------------------------
alter table companies       enable row level security;
alter table jobs            enable row level security;
alter table profiles        enable row level security;
alter table watches         enable row level security;
alter table company_watches enable row level security;
alter table saved_jobs      enable row level security;
alter table hidden_jobs     enable row level security;
alter table alert_matches   enable row level security;
alter table crawl_runs      enable row level security;

create policy "public read companies" on companies for select using (not is_disabled);
create policy "public read visible jobs" on jobs for select
  using (is_active and not is_disabled and duplicate_of is null);

create policy "own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own watches" on watches for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own company watches" on company_watches for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own saved jobs" on saved_jobs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own hidden jobs" on hidden_jobs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own alert matches" on alert_matches for select using (auth.uid() = user_id);
-- crawl_runs: no public policy, service role only.
