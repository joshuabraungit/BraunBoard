-- A watch can ask for "First AE job" roles only (AE jobs open to 0 to 2 years of closing, or SDR time).
-- Only narrows AE jobs; other roles on the same watch are untouched. See fitsFirstAe in match.ts.
alter table public.watches add column if not exists first_ae_only boolean not null default false;
