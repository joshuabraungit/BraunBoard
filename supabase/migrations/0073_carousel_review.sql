-- A LinkedIn carousel (a swipeable PDF) for a sponsored job, reviewed on the same magic link.
-- The slides are stored as image links, one per line, so the client can swipe through them on the
-- review page; the PDF link is what gets posted. Changing either asks the client to look again.
alter table public.sponsored_jobs
  add column if not exists carousel_slides text check (char_length(carousel_slides) <= 20000),
  add column if not exists carousel_pdf_url text check (char_length(carousel_pdf_url) <= 2000),
  add column if not exists carousel_intro text check (char_length(carousel_intro) <= 1000),
  add column if not exists carousel_review text check (carousel_review in ('up', 'down')),
  add column if not exists carousel_note text,
  add column if not exists carousel_reviewed_hash text;
