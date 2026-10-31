-- Client review: a private magic link where the sponsor gives a thumbs up or down on the
-- explainer video and the job ad. Each decision is stamped with the version it was about,
-- so editing the ad (or swapping the video) puts it back up for review.
alter table public.sponsored_jobs
  add column if not exists review_token text,
  add column if not exists video_path text,
  add column if not exists video_review text check (video_review in ('up', 'down')),
  add column if not exists video_note text,
  add column if not exists video_reviewed_path text,
  add column if not exists ad_review text check (ad_review in ('up', 'down')),
  add column if not exists ad_note text,
  add column if not exists ad_reviewed_hash text,
  add column if not exists review_opened_at timestamptz,
  add column if not exists review_sent_at timestamptz;

-- Every order gets an unguessable link token. Two UUIDs' worth of randomness.
alter table public.sponsored_jobs
  alter column review_token set default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
update public.sponsored_jobs
  set review_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
  where review_token is null;
alter table public.sponsored_jobs alter column review_token set not null;
create unique index if not exists sponsored_jobs_review_token_idx on public.sponsored_jobs (review_token);

-- Public bucket for explainer videos. Josh uploads from Admin through a signed upload URL.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sponsor-videos', 'sponsor-videos', true, 52428800, array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do nothing;
