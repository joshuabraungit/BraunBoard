-- Optional: what % of fully ramped reps earned full OTE last year, as the buyer reported it.
alter table public.sponsored_jobs
  add column if not exists ote_attainment_pct smallint check (ote_attainment_pct between 0 and 100);
