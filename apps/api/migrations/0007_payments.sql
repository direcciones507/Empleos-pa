begin;
create type payment_status as enum ('PENDIENTE','EN_REVISION','APROBADO','RECHAZADO');
create table vacancy_payments(payment_id uuid primary key default gen_random_uuid(),vacancy_id uuid not null references vacancies(vacancy_id) on delete restrict,status payment_status not null default 'PENDIENTE',amount numeric(10,2),reference text,notes text,submitted_at timestamptz,reviewed_at timestamptz,reviewed_by uuid references users(user_id),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create unique index vacancy_payments_active_idx on vacancy_payments(vacancy_id) where status in ('PENDIENTE','EN_REVISION','APROBADO');
create index vacancy_payments_status_idx on vacancy_payments(status,created_at desc);
commit;
