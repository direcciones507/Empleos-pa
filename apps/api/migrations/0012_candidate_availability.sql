begin;
alter table candidate_profiles
  add column if not exists currently_working boolean,
  add column if not exists availability_notes text;
commit;
