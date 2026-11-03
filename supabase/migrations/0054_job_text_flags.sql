-- For You was taking 15-25 seconds: job_text_hits ran regexes and lower() over ~6 MB of
-- job descriptions on every page load. Work those out once, when a job is written, instead.

alter table public.jobs
  add column if not exists commission_only boolean,
  add column if not exists greenfield boolean,
  add column if not exists text_lc text;

create or replace function public.jobs_text_flags() returns trigger
language plpgsql set search_path to 'public' as $$
begin
  new.commission_only := coalesce(new.description_raw, '') ~* '\y(commission[- ]only|100% commission|straight commission)\y';
  new.greenfield := coalesce(new.description_raw, '') ~* '\ygreenfield\y|build (the|a|your) territory from (scratch|the ground up)';
  new.text_lc := lower(new.title_raw || ' ' || coalesce(new.description_raw, ''));
  return new;
end $$;

drop trigger if exists jobs_text_flags on public.jobs;
create trigger jobs_text_flags before insert or update of title_raw, description_raw on public.jobs
  for each row execute function public.jobs_text_flags();

-- Same answers as before. Rows not filled in yet fall back to working it out on the spot.
create or replace function public.job_text_hits(p_ids uuid[], p_keywords text[] default '{}'::text[])
returns table(id uuid, commission_only boolean, greenfield boolean, keyword boolean)
language sql stable set search_path to 'public' as $$
  select * from (
    select
      j.id,
      coalesce(j.commission_only, coalesce(j.description_raw, '') ~* '\y(commission[- ]only|100% commission|straight commission)\y') as commission_only,
      coalesce(j.greenfield, coalesce(j.description_raw, '') ~* '\ygreenfield\y|build (the|a|your) territory from (scratch|the ground up)') as greenfield,
      exists (
        select 1 from unnest(coalesce(p_keywords, '{}')) k
        where k <> '' and strpos(coalesce(j.text_lc, lower(j.title_raw || ' ' || coalesce(j.description_raw, ''))), lower(k)) > 0
      ) as keyword
    from public.jobs j
    where j.id = any(p_ids)
  ) t
  where t.commission_only or t.greenfield or t.keyword;
$$;
