begin;
alter table vacancies add column if not exists confirmations jsonb not null default '{}'::jsonb;
commit;
