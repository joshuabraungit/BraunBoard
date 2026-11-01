-- A "what they sell" headline and story Josh wrote or approved himself. The AI never overwrites it.
alter table public.companies add column if not exists product_locked boolean not null default false;
