-- The thank-you email that goes out the day a sponsored run ends (unless they renewed).
alter table sponsored_jobs add column if not exists thanks_sent_at timestamptz;
