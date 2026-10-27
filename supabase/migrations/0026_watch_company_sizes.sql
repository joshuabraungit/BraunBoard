-- Company sizes a watch wants ("startup", "growth", "large", "enterprise"). Empty means any size.
alter table public.watches add column if not exists company_sizes text[] not null default '{}';
