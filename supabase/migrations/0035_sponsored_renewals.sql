-- Renewals: a renewal is a new order that copies the ad and picks up when the old run ends.
alter table sponsored_jobs
  add column if not exists renewal_of uuid references sponsored_jobs(id),
  add column if not exists renewal_reminded_at timestamptz;
create index if not exists sponsored_jobs_renewal_of_idx on sponsored_jobs (renewal_of);
