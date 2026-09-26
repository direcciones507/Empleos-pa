create table if not exists user_profiles (
  user_id uuid not null references users(user_id) on delete cascade,
  profile_type text not null check (profile_type in ('CANDIDATO','EMPRESA')),
  enabled_at timestamptz not null default now(),
  primary key (user_id, profile_type)
);

insert into user_profiles(user_id,profile_type)
select user_id,role::text from users where role::text in ('CANDIDATO','EMPRESA')
on conflict do nothing;

insert into user_profiles(user_id,profile_type)
select user_id,'CANDIDATO' from candidate_profiles
on conflict do nothing;

insert into user_profiles(user_id,profile_type)
select owner_user_id,'EMPRESA' from companies
on conflict do nothing;

alter table account_reactivation_tokens
  add column if not exists requested_profile text
  check (requested_profile is null or requested_profile in ('CANDIDATO','EMPRESA'));

