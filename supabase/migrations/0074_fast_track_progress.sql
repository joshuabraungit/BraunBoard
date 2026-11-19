-- Fast Track: the sponsor ticks off each claimer on their results page
-- once the person has applied, and once the screening call is done.
alter table public.fast_track_codes
  add column if not exists applied_at timestamptz,
  add column if not exists screened_at timestamptz;
