-- Admin dashboard helpers. Service role only (the admin pages call them server-side).
create or replace function public.admin_overview()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'jobs_live', (select count(*) from public.visible_jobs),
    'jobs_new_1d', (select count(*) from public.visible_jobs where posted_at >= now() - interval '1 day'),
    'jobs_new_7d', (select count(*) from public.visible_jobs where posted_at >= now() - interval '7 days'),
    'jobs_with_pay', (select count(*) from public.visible_jobs where salary_min is not null or ote_min is not null),
    'companies_hiring', (select count(*) from public.company_stats where open_roles > 0),
    'companies_total', (select count(*) from public.companies),
    'companies_no_board', (select count(*) from public.companies where ats_provider is null and not is_disabled),
    'companies_disabled', (select count(*) from public.companies where is_disabled),
    'users', (select count(*) from auth.users),
    'users_7d', (select count(*) from auth.users where created_at >= now() - interval '7 days'),
    'watches', (select count(*) from public.watches),
    'company_watches', (select count(*) from public.company_watches),
    'alerts_sent_30d', (select count(*) from public.alert_matches where sent_at >= now() - interval '30 days'),
    'alerts_clicked_30d', (select count(*) from public.alert_matches where sent_at >= now() - interval '30 days' and clicked_at is not null),
    'alerts_pending', (select count(*) from public.alert_matches where sent_at is null),
    'last_crawl_at', (select max(finished_at) from public.crawl_runs),
    'crawls_24h', (select count(*) from public.crawl_runs where started_at >= now() - interval '24 hours'),
    'crawl_errors_24h', (select count(*) from public.crawl_runs where started_at >= now() - interval '24 hours' and error is not null),
    'jobs_new_24h_found', (select coalesce(sum(jobs_new), 0) from public.crawl_runs where started_at >= now() - interval '24 hours'),
    'recent_errors', (
      select coalesce(jsonb_agg(e), '[]'::jsonb) from (
        select distinct on (c.id) c.name, c.slug, r.error, r.started_at
        from public.crawl_runs r join public.companies c on c.id = r.company_id
        where r.started_at >= now() - interval '24 hours' and r.error is not null
        order by c.id, r.started_at desc
        limit 20
      ) e
    )
  );
$$;

create or replace function public.admin_users()
returns table (
  id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, provider text,
  alert_frequency text, watches int, company_watches int, saved int, alerts_sent int, alerts_clicked int, watch_names text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.email::text, u.created_at, u.last_sign_in_at, u.raw_app_meta_data->>'provider',
    p.alert_frequency::text,
    (select count(*) from public.watches w where w.user_id = u.id)::int,
    (select count(*) from public.company_watches cw where cw.user_id = u.id)::int,
    (select count(*) from public.saved_jobs s where s.user_id = u.id)::int,
    (select count(*) from public.alert_matches a where a.user_id = u.id and a.sent_at is not null)::int,
    (select count(*) from public.alert_matches a where a.user_id = u.id and a.clicked_at is not null)::int,
    (select coalesce(array_agg(w.name order by w.created_at), '{}') from public.watches w where w.user_id = u.id)
  from auth.users u
  left join public.profiles p on p.id = u.id
  order by u.created_at desc;
$$;

revoke execute on function public.admin_overview() from public, anon, authenticated;
revoke execute on function public.admin_users() from public, anon, authenticated;
grant execute on function public.admin_overview() to service_role;
grant execute on function public.admin_users() to service_role;
