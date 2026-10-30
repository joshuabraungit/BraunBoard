-- "What they sell, in plain English" for sponsored jobs, same shape as companies.product_short / product_story.
alter table public.sponsored_jobs
  add column if not exists product_short text,
  add column if not exists product_story text;
