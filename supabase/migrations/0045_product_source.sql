-- Where a "what they sell" story came from: the company's postings, its core product (big companies
-- that sell many things), or Josh in Admin.
alter table public.companies add column if not exists product_source text check (product_source in ('postings', 'core', 'admin'));
update public.companies set product_source = 'admin' where product_locked and product_source is null;
update public.companies set product_source = 'postings' where product_story is not null and product_source is null;
