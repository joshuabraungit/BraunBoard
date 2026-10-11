-- Keep the raw onboarding answers so the "What sales job would you take?" form can be re-edited.
alter table watches add column if not exists answers jsonb;
