create table if not exists candidate_cv_generations (generation_id bigserial primary key, candidate_id uuid not null references candidate_profiles(candidate_id), template text not null check (template in ('clasico','moderno')), created_at timestamptz not null default now());
create index if not exists candidate_cv_generations_candidate_idx on candidate_cv_generations(candidate_id,created_at);
