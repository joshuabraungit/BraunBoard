-- For jobs whose location field doesn't name a country: what the posting says (US, CA, UK, DE,
-- other, unknown) and the words that show it. "other" and "unknown" jobs are kept hidden.
alter table public.jobs add column if not exists country_resolved text check (country_resolved in ('US', 'CA', 'UK', 'DE', 'other', 'unknown'));
alter table public.jobs add column if not exists country_evidence text;
