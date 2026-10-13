-- United Kingdom. Jobs can now be open in the 'UK' market. GBP pay gets a conservative
-- USD value for the pay filters, like CAD. (Postgres 17 can change a generated column in place.)
alter table public.jobs alter column salary_max_usd set expression as (
  case when currency = 'CAD' then round(salary_max * 0.72)::int
       when currency = 'GBP' then round(salary_max * 1.25)::int
       else salary_max end);
alter table public.jobs alter column ote_max_usd set expression as (
  case when currency = 'CAD' then round(ote_max * 0.72)::int
       when currency = 'GBP' then round(ote_max * 1.25)::int
       else ote_max end);
