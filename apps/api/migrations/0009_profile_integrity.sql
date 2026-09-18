begin;
create unique index if not exists companies_owner_unique_idx on companies(owner_user_id);
alter table candidate_profiles alter column valid_until set default null;
commit;
