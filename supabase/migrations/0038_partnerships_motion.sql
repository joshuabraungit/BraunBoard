-- "Partnerships & Channel" filter: Channel now comes from the job title alone
-- (same rule as isChannelTitle in src/lib/ingest/classify.ts), so the filter only shows partner roles.
-- Also hides HR "People Business Partner" roles that slipped in because their titles mention sales.

update jobs
set sales_motion = (case
    when title_raw ~* '\m(channel|partners?|partnerships?|alliances?|resellers?|ecosystems?)\M'
     and title_raw !~* '\m(client|account) partners?\M' then 'Channel'
    else 'Unknown'
  end)::sales_motion
where not classification_overridden
  and (sales_motion = 'Channel') <> (
    title_raw ~* '\m(channel|partners?|partnerships?|alliances?|resellers?|ecosystems?)\M'
    and title_raw !~* '\m(client|account) partners?\M'
  );

update jobs
set is_active = false, removed_at = now()
where is_active
  and not classification_overridden
  and title_raw ~* '\m(people|hr|human resources)( business)? partner\M';
