-- Fast Track: the sponsor's own booking link (Calendly, Google Calendar, HubSpot...).
-- When set, people who claim a code book their screening call right after they apply.
alter table public.sponsored_jobs
  add column if not exists fast_track_booking_url text check (char_length(fast_track_booking_url) <= 1000);
