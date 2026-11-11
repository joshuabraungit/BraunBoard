-- The sponsor results page shows the joshbraun.com newsletter send live (campaign id there),
-- plus any Braun Board email that featured the job.
alter table sponsored_jobs
  add column if not exists report_newsletter_campaign integer check (report_newsletter_campaign > 0),
  add column if not exists report_braunboard_email_sent integer check (report_braunboard_email_sent >= 0);
