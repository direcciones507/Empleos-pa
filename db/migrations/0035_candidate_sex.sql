begin;
alter table candidate_profiles add column if not exists sex text;
alter table candidate_profiles add constraint candidate_profiles_sex_check check (sex is null or sex in ('Masculino','Femenino'));
commit;
