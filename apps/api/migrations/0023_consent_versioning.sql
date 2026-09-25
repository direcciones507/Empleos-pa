begin;
alter table candidate_profiles add column if not exists consent_version text;
alter table candidate_profiles add column if not exists consent_accepted_at timestamptz;
alter table vacancies add column if not exists consent_version text;
alter table vacancies add column if not exists consent_accepted_at timestamptz;
commit;
