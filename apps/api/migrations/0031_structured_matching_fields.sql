begin;

-- Candidate-side structured preferences. Existing free-text fields remain intact
-- so previously saved profiles continue to work unchanged.
alter table candidate_profiles
  add column if not exists salary_minimum numeric(12,2),
  add column if not exists salary_period text,
  add column if not exists employment_types jsonb not null default '[]'::jsonb,
  add column if not exists schedule_preferences jsonb not null default '{}'::jsonb,
  add column if not exists structured_skills jsonb not null default '[]'::jsonb,
  add column if not exists structured_languages jsonb not null default '[]'::jsonb,
  add column if not exists structured_licenses jsonb not null default '[]'::jsonb,
  add column if not exists mobility jsonb not null default '{}'::jsonb;

alter table candidate_profiles
  add constraint candidate_salary_minimum_nonnegative
  check (salary_minimum is null or salary_minimum >= 0);

-- Vacancy-side structured requirements. Legacy text columns remain the source of
-- truth for old vacancies until they are edited/re-saved with structured data.
alter table vacancies
  add column if not exists employment_type text,
  add column if not exists employment_duration text,
  add column if not exists schedule_structured jsonb not null default '{}'::jsonb,
  add column if not exists salary_minimum numeric(12,2),
  add column if not exists salary_maximum numeric(12,2),
  add column if not exists salary_period text,
  add column if not exists salary_negotiable boolean not null default false,
  add column if not exists experience_min_years numeric(5,2),
  add column if not exists experience_scope text,
  add column if not exists structured_requirements jsonb not null default '[]'::jsonb,
  add column if not exists structured_skills jsonb not null default '[]'::jsonb,
  add column if not exists structured_languages jsonb not null default '[]'::jsonb,
  add column if not exists structured_licenses jsonb not null default '[]'::jsonb,
  add column if not exists mobility_requirement jsonb not null default '{}'::jsonb,
  add column if not exists job_level text,
  add column if not exists occupation_code text;

alter table vacancies
  add constraint vacancy_salary_minimum_nonnegative
  check (salary_minimum is null or salary_minimum >= 0),
  add constraint vacancy_salary_maximum_nonnegative
  check (salary_maximum is null or salary_maximum >= 0),
  add constraint vacancy_salary_range_valid
  check (salary_minimum is null or salary_maximum is null or salary_maximum >= salary_minimum),
  add constraint vacancy_experience_min_years_nonnegative
  check (experience_min_years is null or experience_min_years >= 0);

commit;
