-- LinkedIn post engagement on the sponsor results page, typed in from LinkedIn's post analytics.
alter table sponsored_jobs
  add column if not exists report_linkedin_reactions integer check (report_linkedin_reactions >= 0),
  add column if not exists report_linkedin_comments integer check (report_linkedin_comments >= 0);
