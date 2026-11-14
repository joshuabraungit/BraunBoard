-- A second LinkedIn post for a sponsored job, reviewed on the same magic link. Josh can add a
-- short note to the client that shows above it. Same hash trick: editing it asks for another look.
alter table public.sponsored_jobs
  add column if not exists linkedin_post_2 text check (char_length(linkedin_post_2) <= 5000),
  add column if not exists linkedin_post_2_intro text check (char_length(linkedin_post_2_intro) <= 1000),
  add column if not exists linkedin_review_2 text check (linkedin_review_2 in ('up', 'down')),
  add column if not exists linkedin_note_2 text,
  add column if not exists linkedin_reviewed_hash_2 text;
