-- "Who you'd sell to" on sponsored jobs, in plain English, set by Josh in Admin. Regular jobs get it from the crawler.
alter table public.sponsored_jobs
  add column if not exists buyer_short text check (char_length(buyer_short) <= 100);
