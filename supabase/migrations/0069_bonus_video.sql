-- A bonus video for a sponsored job (e.g. a history episode for LinkedIn), reviewed on the same
-- magic link. Stored as a full https link; swapping the link asks the client to look again.
alter table public.sponsored_jobs
  add column if not exists video2_url text check (char_length(video2_url) <= 2000),
  add column if not exists video2_review text check (video2_review in ('up', 'down')),
  add column if not exists video2_note text,
  add column if not exists video2_reviewed_url text;
