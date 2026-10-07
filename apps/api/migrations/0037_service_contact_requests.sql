begin;
create table service_contact_requests (
  contact_request_id uuid primary key default gen_random_uuid(),
  vacancy_id uuid not null references vacancies(vacancy_id) on delete restrict,
  provider_user_id uuid not null references service_provider_profiles(user_id) on delete restrict,
  status text not null default 'REQUESTED' check (status in ('REQUESTED','ACCEPTED_AWAITING_PAYMENT','DECLINED','PAID')),
  price numeric(10,2) not null default 1.89 check (price=1.89),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  paid_at timestamptz,
  unique(vacancy_id,provider_user_id),
  check ((status='PAID')=(paid_at is not null)),
  check (status='REQUESTED' or responded_at is not null)
);
create index service_contacts_provider_idx on service_contact_requests(provider_user_id,created_at desc);
-- Services are charged per accepted connection, never when the request is created.
alter table vacancies drop constraint vacancy_package_limit_check;
alter table vacancies add constraint vacancy_package_limit_check check (
  (package='PERFILES_5' and package_candidate_limit=5 and package_price=8.99) or
  (package='PERFILES_10' and package_candidate_limit=10 and package_price=10.99) or
  (package='PERFILES_15' and package_candidate_limit=15 and package_price=12.99) or
  (package='DISPONIBLES' and package_candidate_limit is null and package_price=25.00) or
  (package='EVENTUAL_399' and request_type='EVENTUAL' and package_candidate_limit is null and package_price in (0,3.99)) or
  package is null or
  (request_type='VACANTE' and package in ('PERFILES_5','PERFILES_10','PERFILES_15','DISPONIBLES') and package_candidate_limit between 1 and 100 and package_price=package_candidate_limit*4.99)
);
commit;
