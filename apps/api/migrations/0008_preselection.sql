begin;
create type candidate_interest_status as enum ('PENDIENTE','INTERESADO','NO_INTERESADO','EXPIRADO');
create type delivery_status as enum ('PREPARANDO','AUTORIZACIONES_PENDIENTES','LISTA','ENVIADA');
create table vacancy_candidates(vacancy_candidate_id uuid primary key default gen_random_uuid(),vacancy_id uuid not null references vacancies(vacancy_id) on delete cascade,candidate_id uuid not null references candidate_profiles(candidate_id) on delete restrict,interest_status candidate_interest_status not null default 'PENDIENTE',contact_authorized boolean not null default false,invited_at timestamptz not null default now(),responded_at timestamptz,admin_notes text,created_at timestamptz not null default now(),unique(vacancy_id,candidate_id));
create table vacancy_deliveries(delivery_id uuid primary key default gen_random_uuid(),vacancy_id uuid not null references vacancies(vacancy_id) on delete restrict,status delivery_status not null default 'PREPARANDO',sent_at timestamptz,sent_by uuid references users(user_id),notes text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index vacancy_candidates_vacancy_idx on vacancy_candidates(vacancy_id,interest_status);
create index vacancy_candidates_candidate_idx on vacancy_candidates(candidate_id,interest_status);
commit;
