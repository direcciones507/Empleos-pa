begin;
create type vacancy_status as enum ('RECIBIDA','PENDIENTE_PAGO','PAGO_EN_REVISION','APROBADA','EN_BUSQUEDA','EN_CONFIRMACION','ENTREGADA','CERRADA','CANCELADA');
create sequence vacancy_code_seq start 1;
create table vacancies(vacancy_id uuid primary key default gen_random_uuid(),company_id uuid not null references companies(company_id) on delete restrict,vacancy_code text not null unique default ('VAC-'||lpad(nextval('vacancy_code_seq')::text,6,'0')),status vacancy_status not null default 'PENDIENTE_PAGO',position text not null,quantity int not null default 1 check(quantity>0),work_location text not null,modality text,schedule text not null,estimated_start date,salary text,minimum_education text,experience_requirement text,skills text not null,languages text,license_requirement text,main_functions text not null,profile_notes text,additional_info text,submitted_at timestamptz not null default now(),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index vacancies_company_idx on vacancies(company_id,created_at desc);
create index vacancies_status_idx on vacancies(status);
commit;
