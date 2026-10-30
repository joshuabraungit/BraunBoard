-- Cancel and refund from Admin: when the refund went through, Stripe's refund id, and the reason Josh gave.
alter table public.sponsored_jobs
  add column if not exists refunded_at timestamptz,
  add column if not exists stripe_refund_id text,
  add column if not exists cancel_reason text;
