begin;
alter table vacancy_delivery_candidates add column if not exists match_analysis jsonb;
alter table vacancies add column if not exists archived_at timestamptz;
commit;
