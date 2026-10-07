begin;
alter table vacancies drop constraint if exists vacancy_package_limit_check;
alter table vacancies add constraint vacancy_package_limit_check check (
  (package='PER_CANDIDATE_499' and request_type='VACANTE' and package_candidate_limit between 1 and 100 and package_price=round(package_candidate_limit*4.99,2)) or
  (package='EVENTUAL_CONTACT_189' and request_type='EVENTUAL' and package_candidate_limit is null and package_price=0.00) or
  package is null or
  package in ('PERFILES_5','PERFILES_10','PERFILES_15','DISPONIBLES','EVENTUAL_399')
);
create table if not exists service_contact_requests(
  service_contact_request_id uuid primary key default gen_random_uuid(),
  vacancy_id uuid not null references vacancies(vacancy_id) on delete restrict,
  provider_user_id uuid not null references users(user_id) on delete restrict,
  company_id uuid not null references companies(company_id) on delete restrict,
  status text not null default 'REQUESTED' check(status in ('REQUESTED','ACCEPTED_AWAITING_PAYMENT','DECLINED','PAID','EXPIRED','CANCELLED')),
  unit_price numeric(10,2) not null default 1.89 check(unit_price=1.89),
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(vacancy_id,provider_user_id)
);
create index if not exists service_contact_requests_provider_status_idx on service_contact_requests(provider_user_id,status,requested_at desc);
create index if not exists service_contact_requests_company_status_idx on service_contact_requests(company_id,status,requested_at desc);
alter table yappy_payment_orders add column if not exists service_contact_request_id uuid references service_contact_requests(service_contact_request_id) on delete restrict;
alter table yappy_payment_orders drop constraint if exists yappy_payment_orders_purpose_check;
alter table yappy_payment_orders add constraint yappy_payment_orders_purpose_check check(purpose in ('TEST','VACANCY','SERVICE_CONTACT'));
commit;
