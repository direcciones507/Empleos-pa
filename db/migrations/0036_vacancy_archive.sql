begin;
alter table vacancies add column if not exists closed_at timestamptz;
alter table vacancies add column if not exists archived_at timestamptz;
create index if not exists vacancies_archive_due_idx on vacancies(closed_at) where archived_at is null and status in ('CERRADA','CANCELADA');
-- Historical completed vacancies cannot be dated reliably from updated_at; do not backdate them.
commit;
