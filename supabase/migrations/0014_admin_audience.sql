-- Who signed up, by the role and country they're looking for. Admin dashboard only.
create or replace function public.admin_audience()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with groups as (
    select distinct w.user_id,
      case
        when r = 'SDR/BDR' then 'SDR / BDR'
        when r = 'Account Executive' then 'Account Executive'
        when r in ('Account Manager', 'Customer Expansion') then 'Account Manager'
        when r = 'Sales Engineer' then 'Sales Engineer'
        when r in ('Sales Manager', 'Sales Director', 'VP Sales', 'CRO') then 'Sales Leader'
      end as role
    from public.watches w, unnest(w.role_families) r
    where w.user_id is not null
  ),
  places as (
    select distinct w.user_id, c as country
    from public.watches w, unnest(coalesce(nullif(w.countries, '{}'), '{US}')) c
    where w.user_id is not null
  )
  select jsonb_build_object(
    'users', (select count(*) from auth.users),
    'users_with_watch', (select count(distinct user_id) from places),
    'users_with_role', (select count(distinct user_id) from groups where role is not null),
    'roles', (
      select coalesce(jsonb_agg(jsonb_build_object('label', role, 'n', n) order by n desc), '[]'::jsonb)
      from (select role, count(distinct user_id) n from groups where role is not null group by role) x
    ),
    'countries', (
      select coalesce(jsonb_agg(jsonb_build_object('label', country, 'n', n) order by n desc), '[]'::jsonb)
      from (select country, count(distinct user_id) n from places group by country) x
    ),
    'picks_subscribers', (select count(*) from public.picks_subscribers where status = 'active')
  );
$$;

revoke execute on function public.admin_audience() from public, anon, authenticated;
grant execute on function public.admin_audience() to service_role;
