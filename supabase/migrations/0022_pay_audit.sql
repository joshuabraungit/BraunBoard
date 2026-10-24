-- Pay changes made by a reprocess run, so they can be reviewed afterwards. Admin only (no policies).
create table if not exists pay_audit (
  id bigserial primary key,
  job_id uuid not null,
  company text,
  title text,
  before jsonb,
  after jsonb,
  run_at timestamptz not null default now()
);
alter table pay_audit enable row level security;
