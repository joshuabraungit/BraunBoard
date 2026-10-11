-- Fixes from Supabase's security + performance advisors.

-- The signup trigger should never be callable through the REST API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Evaluate auth.uid() once per query instead of once per row.
alter policy "own profile" on profiles using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
alter policy "own watches" on watches using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "own company watches" on company_watches using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "own saved jobs" on saved_jobs using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "own hidden jobs" on hidden_jobs using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "own alert matches" on alert_matches using ((select auth.uid()) = user_id);

-- Cover foreign keys
create index if not exists alert_matches_job_idx on alert_matches (job_id);
create index if not exists alert_matches_watch_idx on alert_matches (watch_id);
create index if not exists company_watches_company_idx on company_watches (company_id);
create index if not exists crawl_runs_company_idx on crawl_runs (company_id);
create index if not exists hidden_jobs_job_idx on hidden_jobs (job_id);
create index if not exists jobs_duplicate_of_idx on jobs (duplicate_of);
create index if not exists saved_jobs_job_idx on saved_jobs (job_id);
