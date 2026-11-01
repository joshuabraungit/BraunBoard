-- Germany. Jobs can now be open in the 'DE' market. EUR pay gets a conservative
-- USD value for the pay filters, like CAD and GBP.
alter table public.jobs alter column salary_max_usd set expression as (
  case when currency = 'CAD' then round(salary_max * 0.72)::int
       when currency = 'GBP' then round(salary_max * 1.25)::int
       when currency = 'EUR' then round(salary_max * 1.05)::int
       else salary_max end);
alter table public.jobs alter column ote_max_usd set expression as (
  case when currency = 'CAD' then round(ote_max * 0.72)::int
       when currency = 'GBP' then round(ote_max * 1.25)::int
       when currency = 'EUR' then round(ote_max * 1.05)::int
       else ote_max end);
