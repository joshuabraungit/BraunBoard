-- An optional callout near the top of a Braun's Picks issue (e.g. a Fast Track offer):
-- {"label": "...", "title": "...", "text": "...", "url": "...", "cta": "..."}
alter table public.picks_issues add column if not exists spotlight jsonb;
