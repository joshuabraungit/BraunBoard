-- Every opening on the company's careers page (all teams, all countries), from the latest crawl.
-- Used as a sanity check on company size.
alter table public.companies add column if not exists open_jobs_total int;
update public.companies c set open_jobs_total = l.jobs_seen
from (select distinct on (company_id) company_id, jobs_seen from public.crawl_runs where error is null and finished_at is not null order by company_id, started_at desc) l
where l.company_id = c.id;
