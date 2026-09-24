begin;
alter type vacancy_package add value if not exists 'EVENTUAL_399';
commit;

begin;
alter table vacancies drop constraint if exists vacancy_package_limit_check;
alter table vacancies add constraint vacancy_package_limit_check check (
  (package='PERFILES_5' and package_candidate_limit=5 and package_price=8.99) or
  (package='PERFILES_10' and package_candidate_limit=10 and package_price=10.99) or
  (package='PERFILES_15' and package_candidate_limit=15 and package_price=12.99) or
  (package='DISPONIBLES' and package_candidate_limit is null and package_price=25.00) or
  (package='EVENTUAL_399' and request_type='EVENTUAL' and package_candidate_limit is null and package_price=3.99) or
  package is null
);
commit;
