-- Hunter or farmer: a job title that says so beats the read of the description
-- (same rule as motionFromTitle in src/lib/hunter.ts). Stripe and others put it right in the title:
-- "Account Executive, Enterprise - Hunter", "Account Executive, Platforms (Grower)".
-- Partnerships (Channel) roles keep their own motion.

with t as (
  select id,
    title_raw ~* '\m(hunters?|new business|new logos?|net[- ]new|acquisition)\M' as hunter,
    title_raw ~* '\m(growers?|farmers?|existing business|existing customers?|install(ed)? base|account management)\M' as farmer
  from jobs
  where not classification_overridden and sales_motion <> 'Channel'
)
update jobs j
set sales_motion = (case when t.hunter and t.farmer then 'Mixed' when t.hunter then 'New Logo' else 'Expansion' end)::sales_motion
from t
where j.id = t.id
  and (t.hunter or t.farmer)
  and j.sales_motion <> (case when t.hunter and t.farmer then 'Mixed' when t.hunter then 'New Logo' else 'Expansion' end)::sales_motion;
