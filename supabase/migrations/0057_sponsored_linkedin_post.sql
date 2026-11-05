-- The LinkedIn post Josh writes for each sponsored job, reviewed by the client on the same
-- magic link as the job ad and video. The verdict is stamped with a hash of the post's words,
-- so editing the post puts it back up for review.
alter table public.sponsored_jobs
  add column if not exists linkedin_post text check (char_length(linkedin_post) <= 5000),
  add column if not exists linkedin_review text check (linkedin_review in ('up', 'down')),
  add column if not exists linkedin_note text,
  add column if not exists linkedin_reviewed_hash text;
