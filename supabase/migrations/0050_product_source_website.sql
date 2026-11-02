-- "What you'd sell" can now come from the company's own home page when its postings never say.
alter table public.companies drop constraint if exists companies_product_source_check;
alter table public.companies add constraint companies_product_source_check
  check (product_source = any (array['postings', 'core', 'admin', 'website']));
