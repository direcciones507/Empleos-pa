begin;
create table candidate_education(education_id uuid primary key default gen_random_uuid(),candidate_id uuid not null references candidate_profiles(candidate_id) on delete cascade,level text not null,institution text,title text,status text,graduation_year int,sort_order int not null default 0,created_at timestamptz not null default now());
create table candidate_experience(experience_id uuid primary key default gen_random_uuid(),candidate_id uuid not null references candidate_profiles(candidate_id) on delete cascade,company text,position text not null,date_from date,date_to date,is_current boolean not null default false,duties text not null,departure_reason text,sort_order int not null default 0,created_at timestamptz not null default now());
create index candidate_education_candidate_idx on candidate_education(candidate_id);
create index candidate_experience_candidate_idx on candidate_experience(candidate_id);
commit;
