begin;
create table if not exists vacancy_delivery_candidates (
  delivery_candidate_id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references vacancy_deliveries(delivery_id) on delete cascade,
  candidate_id uuid not null references candidate_profiles(candidate_id),
  candidate_code text not null,
  full_name text not null,
  phone text,
  email text,
  primary_job_area text,
  work_profile text,
  skills text,
  province text,
  district text,
  education jsonb not null default '[]'::jsonb,
  experience jsonb not null default '[]'::jsonb,
  snapshot_at timestamptz not null default now(),
  unique(delivery_id,candidate_id)
);
create index if not exists vacancy_delivery_candidates_delivery_idx on vacancy_delivery_candidates(delivery_id);
commit;
