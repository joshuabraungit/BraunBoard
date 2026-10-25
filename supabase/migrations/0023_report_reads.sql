-- Job Market Report: what each posting says about pay and the details behind it. Admin only (no policies).
create table if not exists report_reads (
  job_id uuid primary key references jobs(id) on delete cascade,
  report text not null,
  read jsonb not null,
  board_pay jsonb,
  tokens_in int,
  tokens_out int,
  read_at timestamptz not null default now()
);
alter table report_reads enable row level security;
