begin;
create type vacancy_request_type as enum ('VACANTE','EVENTUAL');
alter table vacancies add column if not exists request_type vacancy_request_type not null default 'VACANTE';
create index if not exists vacancies_request_type_idx on vacancies(request_type,status);
commit;
