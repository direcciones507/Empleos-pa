begin;
create type vacancy_package as enum ('PERFILES_5','PERFILES_10','PERFILES_15','DISPONIBLES');
alter table vacancies
  add column package vacancy_package,
  add column package_candidate_limit int,
  add column package_price numeric(10,2);
alter table vacancies add constraint vacancy_package_limit_check check (
  (package='PERFILES_5' and package_candidate_limit=5 and package_price=8.99) or
  (package='PERFILES_10' and package_candidate_limit=10 and package_price=10.99) or
  (package='PERFILES_15' and package_candidate_limit=15 and package_price=12.99) or
  (package='DISPONIBLES' and package_candidate_limit is null and package_price=25.00) or
  package is null
);
commit;
