-- Workday and SmartRecruiters boards.
alter type public.ats_provider add value if not exists 'workday';
alter type public.ats_provider add value if not exists 'smartrecruiters';
