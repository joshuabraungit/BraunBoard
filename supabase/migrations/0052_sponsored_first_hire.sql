-- Josh's flag for a sponsor hiring its first dedicated sales rep. With no team yet there's no
-- "% of reps who hit OTE", so the card says "Ground floor: first sales hire" instead of leaving a gap.
alter table public.sponsored_jobs
  add column if not exists first_sales_hire boolean not null default false;
