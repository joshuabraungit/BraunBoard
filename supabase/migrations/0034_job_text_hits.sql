-- For You ranking used to download the full description of up to 1,000 jobs (about 6 MB)
-- on every home page visit, just to run three text checks. This runs those checks in the
-- database and sends back yes/no answers, only for jobs where something matched.
--
-- Keep these patterns in step with dealbreakerHit() and the keyword check in src/lib/match.ts.
-- Postgres uses \y for a word boundary where JavaScript uses \b.
create or replace function public.job_text_hits(p_ids uuid[], p_keywords text[] default '{}')
returns table (id uuid, commission_only boolean, greenfield boolean, keyword boolean)
language sql
stable
security invoker
set search_path = public
as $$
  select * from (
    select
      j.id,
      coalesce(j.description_raw, '') ~* '\y(commission[- ]only|100% commission|straight commission)\y' as commission_only,
      coalesce(j.description_raw, '') ~* '\ygreenfield\y|build (the|a|your) territory from (scratch|the ground up)' as greenfield,
      exists (
        select 1 from unnest(coalesce(p_keywords, '{}')) k
        where k <> '' and strpos(lower(j.title_raw || ' ' || coalesce(j.description_raw, '')), lower(k)) > 0
      ) as keyword
    from public.visible_jobs j
    where j.id = any(p_ids)
  ) t
  where t.commission_only or t.greenfield or t.keyword;
$$;

grant execute on function public.job_text_hits(uuid[], text[]) to anon, authenticated;
