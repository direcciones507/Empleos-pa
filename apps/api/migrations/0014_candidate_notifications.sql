begin;
create table candidate_notifications(
  notification_id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidate_profiles(candidate_id) on delete cascade,
  vacancy_id uuid references vacancies(vacancy_id) on delete set null,
  type text not null,
  title text not null,
  message text not null,
  read_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(candidate_id,vacancy_id,type)
);
create index candidate_notifications_candidate_idx on candidate_notifications(candidate_id,created_at desc);
commit;
