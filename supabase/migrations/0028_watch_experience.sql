-- Who the rep has sold to (buyers and industries), as matching words. Only ever boosts a match.
alter table public.watches add column if not exists experience text[] not null default '{}';
