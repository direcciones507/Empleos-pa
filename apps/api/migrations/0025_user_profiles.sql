begin;

-- Authentication already reads/writes public profiles independently of users.role.
-- Keep this migration before structured fields so a fresh database supports the
-- same session and route authorization flow as an existing installation.
create table if not exists user_profiles (
  user_id uuid not null references users(user_id) on delete cascade,
  profile_type text not null check (profile_type in ('CANDIDATO','EMPRESA')),
  created_at timestamptz not null default now(),
  primary key (user_id,profile_type)
);

insert into user_profiles(user_id,profile_type)
select user_id,role::text from users where role in ('CANDIDATO','EMPRESA')
on conflict do nothing;

commit;
